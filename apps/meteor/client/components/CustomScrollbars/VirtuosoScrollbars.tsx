import type { ComponentProps, ForwardedRef, PropsWithoutRef, ReactElement } from 'react';
import React, { forwardRef } from 'react';

import CustomScrollbars from './CustomScrollbars';

type VirtuosoScrollbarsProps = PropsWithoutRef<ComponentProps<typeof CustomScrollbars>>;

const VirtuosoScrollbars = forwardRef(function VirtuosoScrollbars(
	{ style, children, ...props }: VirtuosoScrollbarsProps,
	ref: ForwardedRef<HTMLDivElement>,
): ReactElement {
	return (
		<CustomScrollbars
			style={{ ...style, flexGrow: 1, overflowY: 'hidden', width: '100%', willChange: 'transform' }}
			ref={ref}
			renderView={(viewProps): ReactElement => <div {...viewProps} {...props} />}
		>
			{children}
		</CustomScrollbars>
	);
});

export default VirtuosoScrollbars;
