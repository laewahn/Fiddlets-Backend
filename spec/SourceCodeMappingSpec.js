/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("The source code mapping", function() {
	
	var fs = require("fs");
	var SourceCodeMapping = require("../SourceCode");
	
	var source = fs.readFileSync("spec/source/sampleSource.js", "utf8");
		
	it("should be initialized with source code", function() {
		var testMapping = new SourceCodeMapping(source);

		expect(testMapping).toBeDefined();
	});
});