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

xdescribe("mustache.js", function() {
	var source = fs.readFileSync("spec/mustache.js", "utf8");
	// contextCollectorAPI.setDebug(true);

	it("should not include unknown variables when they are not referred to in any of the lines", function() {
		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);

		var context = collector.contextForLine(30, source);
		expect(context).toEqual("");

		context = collector.contextForLine(31, source);
		expect(context).toEqual("");
	});

	it("should return the context for the first task", function(){
		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);

		var context = collector.contextForLine(32, source);
		expect(context).toEqual("var string = <#undefined:string:32#>;\nvar regExpMetaCharacters = /[\\-\\[\\]{}()*+?.,\\\\\\^$|#\\s]/g;\nvar replacement = '\\\\$&';");
	});

	it("should return the context for the second task", function(){
		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);

		var task2Scope = collector.getScopeForLine(66);
	
		var fromEntityMapScope = task2Scope.getContainedScope(0);
		expect(fromEntityMapScope.getName()).toEqual("fromEntityMap");
		expect(fromEntityMapScope.getUnknownVariables()).toEqual(["s" ,"entityMap"]);

		var context = collector.contextForLine(66, source);
		var expectedContext =  "var html = <#undefined:html:66#>;\n" +
							   "var entityMap = <#undefined:entityMap:66#>;\n" +
    						   "var htmlMetaCharacters = /<|>/;\n" +
    						   "function fromEntityMap (s) {\n" +
    						   "\tvar replacement = entityMap[s];\n" +
    						   "\treturn replacement;\n" +
    						   "}\n" + 
    						   "var htmlAsString = String(html);";

		expect(context).toEqual(expectedContext);
	});

	it("should return the context for the fromEntityMap function", function() {
		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);

		var fromEntityMapContext = collector.contextForLine(62, source);
		expect(fromEntityMapContext).toEqual("var s = <#undefined:s:62#>;\nvar entityMap = <#undefined:entityMap:62#>;\nvar replacement = entityMap[s];");
	});

	it("should get the darn context..", function() {
		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);

		var context = collector.contextForLine(136, source);
		console.log("Context: " + context);
	});
	
});

describe("weather", function() {
	it("should not fail", function() {
		var source = fs.readFileSync("spec/weather.js", "utf8");

		var ContextCollector = contextCollectorAPI.ContextCollector;
		var collector = new ContextCollector(source);

		var context = collector.contextForLine(38, source);
		console.log(context);
	});
});