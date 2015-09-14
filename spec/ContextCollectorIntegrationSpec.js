/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("The study sample code", function() {
	it("should parse without exception", function() {
		var fs = require("fs");
		var source = fs.readFileSync("spec/sampleSource.js", "utf8");

		var contextCollectorAPI = require("../ContextCollector");
		var context = contextCollectorAPI.contextForLineInSource(23, source);

		expect(context).toBeDefined();
		
		expect(context.lines.some(function(line){
			return line.start.line === 20 && line.end.line === 20;
		})).toBe(true);

		expect(context.lines.some(function(line){
			return line.start.line === 21 && line.end.line === 21;
		})).toBe(true);
	});
});