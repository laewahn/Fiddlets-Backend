/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global require, exports */

(function() {
	"use strict";

	var LINEINFO_DOMAIN = "LineInfoDomain";
	var LINEINFO_VERSION = {major: 0, minor: 1};

	var lineInfo = require("./LineInfo");

	exports.init = function(domainManager) {
		if (!domainManager.hasDomain(LINEINFO_DOMAIN)) {
			domainManager.registerDomain(LINEINFO_DOMAIN, LINEINFO_VERSION);
		}

		domainManager.registerCommand(
			LINEINFO_DOMAIN,
			"infoForLine",
			lineInfo.infoForLine,
			false,
			"Parses the given code",
			[{
				name: "line",
				type: "string",
				description: "The line"
			}],
			[{
				name: "result",
				type: "object",
				description: "The line info for the line."
			}]
		);
	};

})();