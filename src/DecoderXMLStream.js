'use strict';

import debug from 'debug';
import stream from 'stream';
import iconv from 'iconv-lite';
import findEncodingInXMLBuffer from './findEncoding';
import DEFAULT_ENCODING from './defaultEncoding';
import pkg from '../package.json';

const Transform = stream.Transform;
const debugMe = debug(`${pkg.name}:stream`);

function concatBuffers(chunks) {
  let totalLength = chunks.reduce((previousValue, chunk) => previousValue + chunk.length, 0);

  return Buffer.concat(chunks, totalLength);
}

function DecoderXMLStream(streamOpts) {
  let options = streamOpts || {};

  options.encoding = this.encoding = DEFAULT_ENCODING; // we output strings

  this.chunks = [];
  this.bufContent = null;
  this.encodingDetected = null;
  Transform.call(this, options);
}

DecoderXMLStream.prototype = Object.create(Transform.prototype, {
  constructor: {
    value: DecoderXMLStream
  }
});

DecoderXMLStream.prototype._transform = function(chunk, encoding, done) {
  if (!Buffer.isBuffer(chunk)) {
    return done(new Error('read-xml#createStream needs buffers as its input'));
  }

  debugMe('receiving chunk..');

  try {
    if (this.encodingDetected) {
      debugMe(`encoding was detected before, decoding chunk to ${this.encodingDetected}..`);
      this.push(iconv.decode(chunk, this.encodingDetected), this.encoding);
      return done();
    }

    this.chunks.push(chunk);
    this.bufContent = concatBuffers(this.chunks);

    debugMe('trying to find encoding..');

    findEncodingInXMLBuffer(this.bufContent, DEFAULT_ENCODING, (err, detectedEncoding) => {
      if (err) {
        return done(err);
      }

      if (detectedEncoding == null) {
        debugMe(`could not find encoding in chunk, decoding to default ${this.encoding}..`);
        this.push(iconv.decode(chunk, this.encoding), this.encoding);
        return done();
      }

      if (!iconv.encodingExists(detectedEncoding)) {
        return done(new Error(`${detectedEncoding} is not supported`));
      }

      debugMe(`encoding detected, decoding chunk to ${detectedEncoding}..`);

      this.emit('encodingDetected', detectedEncoding);

      this.encodingDetected = detectedEncoding;
      this.push(iconv.decode(chunk, detectedEncoding), this.encoding);
      done();
    });
  } catch (err) {
    done(err);
  }
};

export default DecoderXMLStream;
