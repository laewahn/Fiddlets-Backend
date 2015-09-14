/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

describe("The study sample code", function() {
	
	var fs = require("fs");
	var contextCollectorAPI = require("../ContextCollector");
		
	var source = fs.readFileSync("spec/sampleSource.js", "utf8");

	xit("should get the context locations for the easiest example line", function() {
		var context = contextCollectorAPI.contextForLineInSource(23, source);
		
		expect(context.lines.some(function(line){
			return line.start.line === 20 && line.end.line === 20;
		})).toBe(true);

		expect(context.lines.some(function(line){
			return line.start.line === 21 && line.end.line === 21;
		})).toBe(true);
	});

	it("should create a string representation of the context for the easiest line", function() {
		var context = contextCollectorAPI.contextForLineInSource(23, source);

		expect(context.stringRepresentation()).toBe("var weatherInfoCSV = undefined;\nvar csvHeader = \"time,temperature,description\";\n");
	});
});