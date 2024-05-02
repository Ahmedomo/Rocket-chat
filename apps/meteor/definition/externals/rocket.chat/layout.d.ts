// import '@rocket.chat/layout';

declare module '@rocket.chat/layout' {
	import {
		HeroLayout,
		HeroLayoutTitle,
		HorizontalWizardLayout,
		VerticalWizardLayout,
		FormPageLayout,
		BackgroundLayer,
		LayoutLogo,
		List,
		Link,
		ActionLink,
		DarkModeProvider,
		TooltipWrapper,
	} from '@rocket.chat/layout';
	import type { ReactNode, FC, ForwardRefExoticComponent, FormHTMLAttributes, RefAttributes } from 'react';

	export const Form: ForwardRefExoticComponent<
		Omit<FormHTMLAttributes<HTMLFormElement>, 'is'> & {
			children: ReactNode;
		} & RefAttributes<HTMLElement>
	> & {
		Header: ForwardRefExoticComponent<
			Omit<FormHTMLAttributes<HTMLElement>, 'is'> & {
				children: ReactNode;
			} & RefAttributes<HTMLElement>
		>;
		Steps: ({ currentStep, stepCount }: { currentStep: number; stepCount: number }) => ReactNode;
		Title: ForwardRefExoticComponent<
			Omit<FormHTMLAttributes<HTMLElement>, 'is'> & {
				children: ReactNode;
			} & RefAttributes<HTMLElement>
		>;
		Subtitle: ForwardRefExoticComponent<
			Omit<FormHTMLAttributes<HTMLElement>, 'is'> & {
				children: ReactNode;
			} & RefAttributes<HTMLElement>
		>;
		Container: FC<{ children?: ReactNode }>;
		Footer: ForwardRefExoticComponent<
			Omit<FormHTMLAttributes<HTMLElement>, 'is'> & {
				children: ReactNode;
			} & RefAttributes<HTMLElement>
		>;
	};

	export {
		HeroLayout,
		HeroLayoutTitle,
		HorizontalWizardLayout,
		VerticalWizardLayout,
		FormPageLayout,
		BackgroundLayer,
		LayoutLogo,
		List,
		Link,
		ActionLink,
		DarkModeProvider,
		TooltipWrapper,
	};
}
