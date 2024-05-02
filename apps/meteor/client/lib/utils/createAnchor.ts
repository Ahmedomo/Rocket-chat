import { registerAnchor } from './deleteAnchor';

export function createAnchor(id: string, tag?: undefined): HTMLDivElement;
export function createAnchor<TTag extends keyof HTMLElementTagNameMap>(id: string, tag: TTag): HTMLElementTagNameMap[TTag];
export function createAnchor(id: string, tag: keyof HTMLElementTagNameMap = 'div'): HTMLElement {
	const anchor = document.getElementById(id);
	if (anchor && anchor.tagName.toLowerCase() === tag) {
		return anchor;
	}

	const element = document.createElement(tag);
	element.id = id;
	document.body.appendChild(element);

	registerAnchor(element, () => {
		document.body.removeChild(element);
	});
	return element;
}
