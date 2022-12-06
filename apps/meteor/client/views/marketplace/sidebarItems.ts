import { createSidebarItems } from '../../lib/createSidebarItems';

export const {
	registerSidebarItem: registerMarketplaceSidebarItem,
	unregisterSidebarItem: unregisterMarketplaceSidebarItem,
	getSidebarItems: getMarketplaceSidebarItems,
	subscribeToSidebarItems: subscribeToMarketplaceSidebarItems,
} = createSidebarItems([
	{
		href: 'marketplace/explore/list',
		icon: 'cube',
		i18nLabel: 'Explore',
	},
	// {
	// 	href: 'marketplace-enterprise',
	// 	icon: 'lightning',
	// 	i18nLabel: 'Enterprise',
	// },
	{
		href: 'marketplace/installed/list',
		icon: 'circle-arrow-down',
		i18nLabel: 'Installed',
	},
]);
