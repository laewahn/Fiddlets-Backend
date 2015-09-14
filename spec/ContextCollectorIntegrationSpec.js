/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("The study sample code", function() {
	it("should parse without exception", function() {
		var fs = require("fs");
		var source = fs.readFileSync("spec/sampleSource.js", "utf8");

		var contextCollectorAPI = require("../ContextCollector");
		var context = contextCollectorAPI.contextForLineInSource(23, source);
		var contextAsString = context.stringRepresentation();

		expect(contextAsString).toBeDefined();
	});
});