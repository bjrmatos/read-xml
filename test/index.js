'use strict';
import path from 'path';
import expect from 'expect.js';
import { readXML } from '../src';

const getTestFile = fileName => path.join(__dirname, `./xml/${fileName}`);

const smokeTestFileRead = (fileName, done) => {
  readXML(getTestFile(fileName), (err, data) => {
    expect(err).not.to.be.ok();
    expect(data).to.be.ok();
    done();
  });
};

describe('read-xml', () => {
  describe('#readXML', () => {
    // just test that it works
    describe('smoke tests', () => {
      describe('#readXML', () => {
        it('reads simple.xml without crashing', done => {
          smokeTestFileRead('simple.xml', done);
        });
        it('reads simple-with-BOM.xml without crashing', done => {
          smokeTestFileRead('simple-with-BOM.xml', done);
        });
        it('reads simple-no-explicit-encoding.xml without crashing', done => {
          smokeTestFileRead('simple-no-explicit-encoding.xml', done);
        });
        it('reads simple-iso-8859-1.xml without crashing', done => {
          smokeTestFileRead('simple-iso-8859-1.xml', done);
        });
        it('reads complex-iso-8859-1.xml without crashing', done => {
          smokeTestFileRead('complex-iso-8859-1.xml', done);
        });
        it('reads note.xml without crashing', done => {
          smokeTestFileRead('note.xml', done);
        });
      });
    });
  });
});

