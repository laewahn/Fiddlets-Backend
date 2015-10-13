/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global module, require */

(function() {
	"use strict";
	var ASTApi = require("./ASTApi");

	function IdentifierCollector(ast) {
		this.identifiers = [];
		this.ast = ast;

		this.astAPI = new ASTApi(ast, this.identifiers);

		this.astAPI.on("Identifier", function(anIdentifier, identifiers, defaultBehaviour) {
			if (identifiers.indexOf(anIdentifier.name !== -1)) {
				identifiers.push(anIdentifier.name);
			}

			defaultBehaviour();
		});
	}

	IdentifierCollector.prototype.trace = function() {
		return this.astAPI.trace();
	};

	IdentifierCollector.prototype.traceFor = function(members) {
		members.forEach(function(member){
			if (this.ast[member] !== null) {
				this.astAPI.ast = this.ast[member];
				this.astAPI.trace();	
			}
		}, this);

		return this.identifiers;
	};

	IdentifierCollector.prototype.constructor = IdentifierCollector;
	IdentifierCollector.prototype.astAPI = undefined;
	IdentifierCollector.prototype.identifiers = undefined;
	
	module.exports = IdentifierCollector;

})();