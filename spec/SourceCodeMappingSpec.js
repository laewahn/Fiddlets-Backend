/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("The source code mapping", function() {
	
	var fs = require("fs");
	var SourceCodeMapping = require("../ContextCollector").SourceCode;
	
	var source = fs.readFileSync("spec/source/sampleSource.js", "utf8");
		
	it("should be initialized with source code", function() {
		var testMapping = new SourceCodeMapping(source);

		expect(testMapping).toBeDefined();
	});

	it("should allow to access lists of identifiers by their lines", function() {
		var testMapping = new SourceCodeMapping(source);

		expect(testMapping.identifiersInLine(23)).toEqual(["csvHeader", "weatherInfoCSV"]);
	});
});