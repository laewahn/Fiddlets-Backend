/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

var fs = require("fs");
var testSource = fs.readFileSync("spec/testSource.js", "utf8");

describe("The test spec", function() {
	it("should have the source", function() {
		expect(testSource).toBeDefined();
	});
});

describe("The context collector API", function() {
	var contextCollectAPI = require("../ContextCollector.js");

	it("should be accessible through require", function() {	
		expect(contextCollectAPI).toBeDefined();
	});

	it("should be able to parse the code and return the context", function() {
		var testContext = contextCollectAPI.getContextFor(testSource);
		expect(testContext).toBeDefined();
	});

	describe("The context", function() {
		var testContext = contextCollectAPI.getContextFor(testSource);

		it("should return where a variable was declared", function() {
			expect(testContext.linesFor("index")[0].start.line).toEqual(5);
			expect(testContext.linesFor("secondInSameLine")[0].start.line).toEqual(1);
			expect(testContext.linesFor("y")[0].start.line).toEqual(1);
		});

		it("should return where a variable was set", function() {
			expect(testContext.linesFor("y").some(function(line) {
				return line.start.line === 1;
			})).toBe(true);

			expect(testContext.linesFor("secondInSameLine").some(function(line) {
				return line.start.line === 2;
			})).toBe(true);
		});

		it("should return where a variable was assigned to a different variable", function() {
			// var index = y;
			expect(testContext.linesFor("index").some(function(line) {
				return line.start.line === 5;
			})).toBe(true);

			expect(testContext.linesFor("y").some(function(line) {
				return line.start.line === 5;
			})).toBe(true);

			// howMany = secondInSameLine
			expect(testContext.linesFor("howMany").some(function(line) {
				return line.start.line === 24;
			})).toBe(true);

			expect(testContext.linesFor("secondInSameLine").some(function(line) {
				return line.start.line === 24;
			})).toBe(true);			
		});

		it("should return where an object was accessed", function() {
			expect(testContext.linesFor("anArray").some(function(line) {
				return line.start.line === 7;
			})).toBe(true);
		
			expect(testContext.linesFor("anArray").some(function(line) {
				return line.start.line === 8;
			})).toBe(true);

			expect(testContext.linesFor("anArray").some(function(line) {
				return line.start.line === 10;
			})).toBe(true);
		});

		it("should return where a variable was used in an operator", function() {
			// Binary operator
			expect(testContext.linesFor("y").some(function(line) {
				return line.start.line === 3;
			})).toBe(true);

			expect(testContext.linesFor("secondInSameLine").some(function(line) {
				return line.start.line === 3;
			})).toBe(true);

			// contextCollectAPI.setDebug(true);
			testContext = contextCollectAPI.getContextFor(testSource);

			// Ternary operator
			expect(testContext.linesFor("index").some(function(line) {
				return line.start.line === 25;
			})).toBe(true);

			expect(testContext.linesFor("bla").some(function(line) {
				return line.start.line === 25;
			})).toBe(true);

			expect(testContext.linesFor("y").some(function(line) {
				return line.start.line === 25;
			})).toBe(true);
		});

		it("should return where a variable was used as a parameter", function(){
			expect(testContext.linesFor("index").some(function(line) {
				return line.start.line === 10;
			})).toBe(true);

			expect(testContext.linesFor("bla").some(function(line) {
				return line.start.line === 12;
			})).toBe(true);

			expect(testContext.linesFor("appendBla").some(function(line) {
				return line.start.line === 11;
			})).toBe(true);
		});

		it("should return where a function was declared", function() {
			expect(testContext.linesFor("prependFoo").some(function(line) {
				return line.start.line === 20 && line.end.line === 22;
			})).toBe(true);
		});

	});

});

