"use strict"

interface spfmPattern {
	(...a: any[]): string;
}

// TODO (4) : Check data coherency (texts added afterward)
// TODO (5) : check pattern validity on creating spfPattern
// spf : string pattern factory. See http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
// multiple
let spfm = function (pattern: string): spfmPattern {
	return function (...args: any[]) {
		return pattern.replace(/{(\d+)}/g, function (_match, number) {
			return typeof args[number] !== 'undefined' ? args[number] : '(?)';
		});
	}
}

interface spf2Pattern {
	(v: number, m: number): string;
}

// value / maxValue pattern
let spf2 = function (pattern: string): spf2Pattern {
	return function (v: number, m: number) {
		return pattern.replace(/{(\d+)}/g, function (_match, number) {
			return number == 0 ? String(v) : String(m);
		});
	}
}

interface spf3Pattern {
	(v: number, m: number, r: number): string;
}

// value / maxValue / regain pattern
let spf3 = function (pattern: string): spf3Pattern {
	return function (v: number, m: number, r: number) {
		return pattern.replace(/{(\d+)}/g, function (_match, number) {
			if (number == 0) return String(v)
			else if (number == 1) return String(m)
			else return String(r);
		});
	}
}

module I18n {
	export interface Corpus {
		global_error: string
		, welcome_name: spfmPattern
		, welcome_name_short: ['Bienvenue § !', { n: 0 }]
		, disconnected: string
		, cancel: string
		, close: string
		, options: string
		, x_messages: string[]
	}
}

var i18n_en: I18n.Corpus = {
	global_error: 'Une erreur est survenue, veuillez nous excuser pour le désagrément.'
	, welcome_name: spfm('Hello {0}')
	, welcome_name_short: ['Bienvenue § !', { n: 0 }]
	, disconnected: 'Vous avez été déconnecté et allez être dirigé vers la page d\'identification.'
	, cancel: 'Annuler'
	, close: 'Fermer'
	, options: 'Options'	
	, x_messages: [ 'Unkown command', 'Server error', 'Database error', 'Session expired', 'Login error', 'Invalid captcha', 'Invalid code', 'Invalid mail', 'Name not available', 'Mail not available', 'Password is too weak']

}

var i18n_fr: I18n.Corpus = {
	global_error: 'Une erreur est survenue, veuillez nous excuser pour le désagrément.'
	, welcome_name: spfm('Bonjour {0}')
	, welcome_name_short: ['Bienvenue § !', { n: 0 }]
	, disconnected: 'Vous avez été déconnecté et allez être dirigé vers la page d\'identification.'
	, cancel: 'Annuler'
	, close: 'Fermer'
	, options: 'Options'
	, x_messages: ['Commande inconnue', 'Erreur serveur', 'Erreur base de donnée', 'Session expirée', "Erreur d'identification", 'Captcha invalide', 'Code invalide', 'Email invalide','Nom indisponible','E-mail indisponible','Mot de passe trop faible']	
}

var i18n: I18n.Corpus = i18n_fr; // current langage selection TODO (2) : dynamic ? from server configuration ? from browser ?


	

