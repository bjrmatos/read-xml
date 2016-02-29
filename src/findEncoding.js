'use strict';

import debug from 'debug';
import once from 'once';
import parseAttributes from 'parse-attributes';
import sax from 'sax';
import pkg from '../package.json';

const debugMe = debug(`${pkg.name}:parse-xml`);

function findEncodingAttr(xmlDeclaration) {
  let indexEncoding,
      indexUpperEncoding,
      propToUse;

  // look for the last encoding attr
  indexEncoding = xmlDeclaration.lastIndexOf('encoding');
  indexUpperEncoding = xmlDeclaration.lastIndexOf('ENCODING');
  propToUse = indexEncoding > indexUpperEncoding ? 'encoding' : 'ENCODING';

  return parseAttributes(xmlDeclaration)[propToUse];
}

function findEncodingInXMLBuffer(buf, defaultEncoding, cb) {
  const xmlParser = sax.parser(false, {
    trim: false,
    normalize: false,
    lowercase: false,
    strictEntities: false
  });

  const xmlContent = buf.toString();
  const done = once((err, encoding) => cb(err, encoding));

  xmlParser.onerror = function(err) {
    debugMe('xml parser error (parsing will be continued):', err.message);
    xmlParser.error = null;
    xmlParser.resume();
  };

  xmlParser.onopentag = function(node) {
    debugMe('open tag found:', node.name);

    if (done.called) {
      return;
    }

    debugMe('encoding to be used:', defaultEncoding);
    done(null, defaultEncoding);
  };

  xmlParser.onprocessinginstruction = function(instruction) {
    debugMe('processing instruction found:', instruction.name);

    if (done.called) {
      return;
    }

    if (instruction.name.toLowerCase() === 'xml') {
      let xmlEncoding = findEncodingAttr(instruction.body);
      debugMe('detected encoding in xml:', xmlEncoding);
      xmlEncoding = xmlEncoding || defaultEncoding;
      debugMe('encoding to be used:', xmlEncoding);
      done(null, xmlEncoding);
    }
  };

  xmlParser.onend = function() {
    debugMe('xml parsing has ended..');

    if (done.called) {
      return;
    }

    debugMe('no tag or xml declaration was found..');
    done(null, undefined);
  };

  debugMe('parsing chunk:', xmlContent);
  xmlParser.write(xmlContent).close();
}

export default findEncodingInXMLBuffer;
