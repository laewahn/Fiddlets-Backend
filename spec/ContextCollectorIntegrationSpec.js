/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global describe, it, require, expect */

"use strict";

var fs = require("fs");
var contextCollectorAPI = require("../ContextCollector");
	

xdescribe("The study sample code", function() {		
	var source = fs.readFileSync("spec/sampleSource.js", "utf8");

	it("should create a string representation of the context for the easiest line", function() {
		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);

		var context = collector.contextForLine(23, source);

		expect(context).toEqual("var weatherInfoCSV = <#undefined#>;\nvar csvHeader = \"time,temperature,description\\n\";");
	});
});

describe("mustache.js", function() {
	var source = fs.readFileSync("spec/mustache.js", "utf8");
	// contextCollectorAPI.setDebug(true);

	it("should return the context for the first task", function(){
		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);

		var context = collector.contextForLine(32, source);
		expect(context).toEqual("var string = <#undefined:string:32#>;\nvar regExpMetaCharacters = /[\\-\\[\\]{}()*+?.,\\\\\\^$|#\\s]/g;\nvar replacement = '\\\\$&';");
	});

	it("should return the context for the second task", function(){
		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);
		// console.log(collector.getScopeForLine);

		var task2Scope = collector.getScopeForLine(66);
		task2Scope.resolveUnknowns();

		console.log(task2Scope.getLocals());
		console.log(task2Scope.getLocationsForIdentifier("fromEntityMap"));

		var fromEntityMapScope = task2Scope.getContainedScope(0);
		expect(fromEntityMapScope.getName()).toEqual("fromEntityMap");
		expect(fromEntityMapScope.getUnknownVariables()).toEqual(["entityMap"]);

		fail("Problem here is that the entityMap is not noted as unknown by the escapeHTML scope.");

		var context = collector.contextForLine(66, source);
		console.log(context);
		var expectedContext = "var string = <#undefined:string#>;\n" + 
							  "var htmlMetaCharacters = /* Replace this: */ /\\S/g /* with your regexp */;\n" +
							  "function fromEntityMap (s) {\n" +
							  "\tvar entityMap = {\n" +
							  "\t\t'&': '&amp;',\n" + 
							  "\t\t'<': '&lt;',\n" + 
							  "\t\t'>': '&gt;',\n" +
							  "\t\t'\"': '&quot;',\n" +
							  "\t\t\"'\": '&#39;',\n" + 
							  "\t\t'/': '&#x2F;'\n" +
							  "\t};\n" +
							  "\treturn entityMap[s];\n" +
							  "}";

		expect(context).toEqual(expectedContext);
	});	
	
});