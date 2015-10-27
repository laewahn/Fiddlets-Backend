/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global require, exports */

(function() {
	"use strict";

	var CONTEXTCOLLECTOR_DOMAIN = "ContextCollectorDomain";
	var ESPRIMA_VERSION = {major: 0, minor: 1};

	var contextCollectorAPI = require("ContextCollector");
	var ContextCollector = contextCollectorAPI.ContextCollector;
	

	exports.init = function(domainManager) {
		if (!domainManager.hasDomain(CONTEXTCOLLECTOR_DOMAIN)) {
			domainManager.registerDomain(CONTEXTCOLLECTOR_DOMAIN, ESPRIMA_VERSION);
		}

		domainManager.registerCommand(
			CONTEXTCOLLECTOR_DOMAIN,
			"contextForLine",
			generateContextForLine,
			false,
			"Generates context for the given line in the given source",
			[{
				name: "line",
				type: "number",
				description: "Line number for context"
			},
			{
				name: "source",
				type: "string",
				description: "The source code"
			}],
			[{
				name: "context",
				type: "string",
				description: "The context."
			}]
		);
	};

	function generateContextForLine(line, source) {
		var collector = new ContextCollector(source);
		var context = collector.contextForLine(line, source);
		return context;
	}


})();