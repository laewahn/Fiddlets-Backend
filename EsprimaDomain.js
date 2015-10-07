/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global require, exports */

(function() {
	"use strict";

	var ESPRIMA_DOMAIN = "EsprimaDomain";
	var ESPRIMA_VERSION = {major: 0, minor: 1};

	var esprima = require("esprima");

	exports.init = function(domainManager) {
		if (!domainManager.hasDomain(ESPRIMA_DOMAIN)) {
			domainManager.registerDomain(ESPRIMA_DOMAIN, ESPRIMA_VERSION);
		}

		domainManager.registerCommand(
			ESPRIMA_DOMAIN,
			"parse",
			esprima.parse,
			false,
			"Parses the given code",
			[{
				name: "code",
				type: "string",
				description: "The code"
			},
			{
				name: "options",
				type: "object",
				description: "Additional options for parsing"
			}]
		);
	};

})();