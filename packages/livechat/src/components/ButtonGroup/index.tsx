import type { ComponentChildren, VNode } from 'preact';
import { cloneElement, toChildArray } from 'preact';
import { memo } from 'preact/compat';

import { createClassName } from '../../helpers/createClassName';
import styles from './styles.scss';

export const ButtonGroup = memo(({ children, full = false }: { children: ComponentChildren; full?: boolean }) => (
	<div className={createClassName(styles, 'button-group', { full })}>
		{toChildArray(children).map((child) => cloneElement(child as VNode, { className: createClassName(styles, 'button-group__item') }))}
	</div>
));
