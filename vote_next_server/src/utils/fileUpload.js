// vote_next_server/src/utils/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, JPG, and GIF are allowed.'), false);
  }
};

const getPngDimensions = (buffer) => {
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error('Invalid PNG file.');
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const getGifDimensions = (buffer) => {
  const header = buffer.subarray(0, 6).toString('ascii');
  if (buffer.length < 10 || (header !== 'GIF87a' && header !== 'GIF89a')) {
    throw new Error('Invalid GIF file.');
  }

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
};

const getJpegDimensions = (buffer) => {
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf,
  ]);

  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('Invalid JPEG file.');
  }

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= buffer.length) {
      break;
    }

    const marker = buffer[offset];

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 2 >= buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset + 1);
    if (segmentLength < 2) {
      throw new Error('Invalid JPEG file.');
    }

    if (startOfFrameMarkers.has(marker)) {
      if (offset + 8 >= buffer.length) {
        break;
      }

      return {
        height: buffer.readUInt16BE(offset + 4),
        width: buffer.readUInt16BE(offset + 6),
      };
    }

    offset += segmentLength + 1;
  }

  throw new Error('Unable to read JPEG dimensions.');
};

const getImageDimensions = async (file) => {
  const buffer = await fs.promises.readFile(file.path);

  switch (file.mimetype) {
    case 'image/png':
      return getPngDimensions(buffer);
    case 'image/gif':
      return getGifDimensions(buffer);
    case 'image/jpeg':
    case 'image/jpg':
      return getJpegDimensions(buffer);
    default:
      throw new Error('Unsupported image type.');
  }
};

const getUploadedFiles = (req) => {
  const files = [];

  if (req.file) {
    files.push(req.file);
  }

  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((group) => {
      if (Array.isArray(group)) {
        files.push(...group);
      }
    });
  }

  return files.filter((file) => file && file.path);
};

const removeUploadedFiles = async (files) => {
  await Promise.allSettled(
    files.map((file) => fs.promises.unlink(file.path))
  );
};

const validateImageDimensions = async (req, res, next) => {
  const files = getUploadedFiles(req);

  if (files.length === 0) {
    return next();
  }

  try {
    for (const file of files) {
      const { width, height } = await getImageDimensions(file);

      if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
        await removeUploadedFiles(files);
        return next(
          new Error(
            `Image dimensions must not exceed ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT} pixels.`
          )
        );
      }
    }

    return next();
  } catch (error) {
    await removeUploadedFiles(files);
    return next(error);
  }
};

const withImageValidation = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (error) {
      return next(error);
    }

    return validateImageDimensions(req, res, next);
  });
};

const uploadConfig = {
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
};

// Initialize multer
const upload = multer(uploadConfig);
const createUploadMiddleware = (method, args) =>
  withImageValidation(multer(uploadConfig)[method](...args));

upload.single = (...args) => createUploadMiddleware('single', args);
upload.array = (...args) => createUploadMiddleware('array', args);
upload.fields = (...args) => createUploadMiddleware('fields', args);
upload.any = (...args) => createUploadMiddleware('any', args);

module.exports = upload;
