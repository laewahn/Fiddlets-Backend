/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global module, require */

(function() {
	"use strict";

	var Line = require("./Line");

	function Context() {
		this.unknownVariables = {};
		this.lines = [];
	}

	Context.prototype.unknownVariables = undefined;
	Context.prototype.lines = undefined;

	Context.prototype.addUnknownVariableWithLocation = function(variableIdentifier, location) {
		this.unknownVariables[variableIdentifier] = location;
	};

	Context.prototype.hasUnknownVariable = function(variableIdentifier) {
		return this.unknownVariables[variableIdentifier] !== undefined;
	};

	Context.prototype.removeUnknownVariable = function(variableIdentifier) {
		if (this.hasUnknownVariable(variableIdentifier)) {
			this.unknownVariables[variableIdentifier] = undefined;
		}
	};

	Context.prototype.addLineWithSourceAndLocation = function(lineSource, location) {
		this.lines.push(new Line(lineSource, location));
	};

	Context.prototype.hasLine = function(line) {
		return this.lines.some(function(e) {
			return e.source === line;
		});
	};

	Context.prototype.stringRepresentation = function() {
		function byLocation(lineA, lineB) {
			return lineA.startsBefore(lineB);
		}

		return this.lines.sort(byLocation).map(function(line) {return line.source;}).join("\n");
	};

	module.exports = Context;
})();