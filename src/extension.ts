import * as vscode from 'vscode';
import * as rs from 'text-readability';
import { split } from 'sentence-splitter';

export function activate(context: vscode.ExtensionContext) {

	console.log('vscode-english-complexity is activated');

	let timeout: NodeJS.Timer | undefined = undefined;

	const fairlyDifficultDecoration = vscode.window.createTextEditorDecorationType({
		cursor: 'crosshair',
		textDecoration: `underline rgb(150,0,0) dotted`,
	});

	const difficultDecoration = vscode.window.createTextEditorDecorationType({
		cursor: 'crosshair',
		textDecoration: `underline rgb(200,0,0) dotted`,
	});

	const veryConfusingDecoration = vscode.window.createTextEditorDecorationType({
		cursor: 'crosshair',
		textDecoration: `underline rgb(250,0,0) dotted`,
	});

	let activeEditor = vscode.window.activeTextEditor;

	function scoreToWords(score: number): string {
		if (score < 30) return "Very Confusing";
		if (score < 50) return "Difficult";
		if (score < 60) return "Fairly Difficult";
		if (score < 70) return "Standard";
		if (score < 80) return "Fairly Easy";
		if (score < 90) return "Easy";
		return "Very Easy";
	}

	function updateDecorations() {
		if (!activeEditor) {
			return;
		}

		const text = activeEditor.document.getText();
		const sentences = split(text);

		const complexityThreshold = vscode.workspace.getConfiguration("englishcomplexity").get<number>('complexityThreshold', 60);

		const veryConfusingSentences: vscode.DecorationOptions[] = [];
		const difficultSentences: vscode.DecorationOptions[] = [];
		const fairlyDifficultSentences: vscode.DecorationOptions[] = [];
		for (const sentence of sentences) {
			if (sentence.type !== 'Sentence') {
				continue;
			}

			const complexityScore = rs.fleschReadingEase(sentence.raw);

			if (complexityScore < complexityThreshold) {
				const startPos = activeEditor.document.positionAt(sentence.range[0]);
				const endPos = activeEditor.document.positionAt(sentence.range[1]);
				const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: 'Complexity: **' + scoreToWords(complexityScore) + ' (' + complexityScore + ')' + '**' };

				if (complexityScore < 30) {
					veryConfusingSentences.push(decoration);
				} else if (complexityScore < 50) {
					difficultSentences.push(decoration);
				} else {
					fairlyDifficultSentences.push(decoration);
				}

			}
		}

		activeEditor.setDecorations(fairlyDifficultDecoration, fairlyDifficultSentences);
		activeEditor.setDecorations(difficultDecoration, difficultSentences);
		activeEditor.setDecorations(veryConfusingDecoration, veryConfusingSentences);
	}

	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		timeout = setTimeout(updateDecorations, 500);
	}

	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

}

