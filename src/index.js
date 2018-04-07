
import fs from 'fs';
import debug from 'debug';
import once from 'once';
import concat from 'concat-stream';
import iconv from 'iconv-lite';
import findEncodingInXMLBuffer from './findEncoding';
import DEFAULT_ENCODING from './defaultEncoding';
import DecoderXMLStream from './DecoderXMLStream';
import pkg from '../package.json';

const debugMe = debug(pkg.name);
const MAX_BYTES_TO_READ = 100;

function readOrCopyBytes(xmlData, bytes, ready) {
  if (Buffer.isBuffer(xmlData)) {
    ready(null, xmlData.slice(0, bytes));
  } else {
    readXMLBytes(xmlData, bytes, ready);
  }
}

function readXMLBytes(path, bytes, ready) {
  const xmlFileStream = fs.createReadStream(path, { start: 0, end: bytes });

  const concatStream = concat((buf) => {
    ready(null, buf);
  });

  xmlFileStream.on('error', (err) => {
    debugMe('error trying to read file', path);
    ready(err);
  });

  xmlFileStream.pipe(concatStream);
}

function decodeXML(content, encoding, cb) {
  if (!iconv.encodingExists(encoding)) {
    return cb(new Error(`${encoding} is not supported`));
  }

  (function(next) {
    if (Buffer.isBuffer(content)) {
      next(null, content);
    } else {
      fs.readFile(content, (readFileErr, xmlBuf) => {
        if (readFileErr) {
          return next(readFileErr);
        }

        next(null, xmlBuf);
      });
    }
  })((err, buf) => {
    if (err) {
      return cb(err);
    }

    debugMe(`decoding xml content (${encoding})..`);

    cb(null, {
      encoding,
      content: iconv.decode(buf, encoding)
    });
  });
}

export function readXML(content, cb) {
  const done = once((err, data) => cb(err, data));
  let readCount = 1,
      bufLength;

  function readBufferHandler(err, encoding) {
    let hasMoreContent = false,
        maxBytes = MAX_BYTES_TO_READ * readCount;

    if (err) {
      return done(err);
    }

    if (bufLength > maxBytes) {
      hasMoreContent = true;
    }

    if (encoding == null) {
      if (!hasMoreContent) {
        return decodeXML(content, DEFAULT_ENCODING, done);
      }

      // eslint-disable-next-line no-plusplus
      readCount++;

      readOrCopyBytes(content, MAX_BYTES_TO_READ * readCount, (readNextErr, nextContent) => {
        if (readNextErr) {
          return done(readNextErr);
        }

        findEncodingInXMLBuffer(nextContent, DEFAULT_ENCODING, readBufferHandler);
      });
    } else {
      decodeXML(content, encoding, done);
    }
  }

  if (Buffer.isBuffer(content)) {
    debugMe('trying to parse xml from buffer..');
    bufLength = content.length;

    findEncodingInXMLBuffer(
      content.slice(0, MAX_BYTES_TO_READ),
      DEFAULT_ENCODING,
      readBufferHandler
    );
  } else {
    debugMe('trying to parse xml from file', content);

    fs.stat(content, (statErr, stats) => {
      if (statErr) {
        return done(statErr);
      }

      // getting the bytes size of file
      bufLength = stats.size;

      readXMLBytes(content, MAX_BYTES_TO_READ, (readXMLErr, xmlBuf) => {
        if (readXMLErr) {
          return done(readXMLErr);
        }

        findEncodingInXMLBuffer(xmlBuf, DEFAULT_ENCODING, readBufferHandler);
      });
    });
  }
}

export function createStream(streamOpts) {
  return new DecoderXMLStream(streamOpts);
}
