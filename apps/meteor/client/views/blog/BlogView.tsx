import { Icon, Grid, Button } from '@rocket.chat/fuselage';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import React, { ReactElement, useState, useEffect } from 'react';

import Page from '../../components/Page';
import BottomBar from '../../components/BottomBar';
import TopBar from '../../topbar/TopBar';
import SingleBlogPost from './SingleBlogPost';
import CreateBlogForm from './components/CreateBlogForm';

import './blog.css';
import PageInlineNavbar from '../../components/PageInlineNavbar/PageInlineNavbar';

const BlogView = (): ReactElement => {
	const [showModal, setShowModal] = useState(false);
	const [blogResults, setBlogResults] = useState<Record<string, string>[]>([]);
	const [updateTitle, setUpdateTitle] = useState('');
	const [updateContent, setUpdateContent] = useState('');
	const [updateTags, setUpdateTags] = useState<string[]>([]);
	const [blogId, setBlogId] = useState('');

	const clearUpdateFields = (): void => {
		setUpdateTitle('');
		setUpdateContent('');
		setUpdateTags([]);
	};

	Meteor.startup(() => {
		Tracker.autorun(() => {
			Meteor.subscribe('getPublishedBlogs');
			return Meteor.call('getBlogs', 10, (error, result) => {
				// TODO: Add a success and error messages
				if (result) {
					const documents = result.toArray();
					setBlogResults(documents);
				} else {
					console.log(error, 'error');
				}
			});
		});
	});

	// useEffect(() => {
	// 	Meteor.call('getBlogs', 10, (error, result) => {
	// 		// TODO: Add a success and error messages
	// 		setBlogResults(result.records);
	// 	});
	// }, []);

	return (
		<Page flexDirection='row'>
			<Page>
				<TopBar />
				<PageInlineNavbar />
				<CreateBlogForm
					showModal={showModal}
					setShowModal={setShowModal}
					blogId={blogId}
					updateTitle={updateTitle}
					updateContent={updateContent}
					updateTags={updateTags}
					clearUpdateFields={clearUpdateFields}
				/>
				<Page.Content>
					<Grid style={{ overflowY: 'auto', overflowX: 'hidden' }}>
						{blogResults.length &&
							blogResults.map((item, index) => (
								<Grid.Item xs={4} md={4} lg={6} key={index}>
									<SingleBlogPost
										{...item}
										setModalShow={setShowModal}
										setBlogId={setBlogId}
										setUpdateTitle={setUpdateTitle}
										setUpdateContent={setUpdateContent}
										setUpdateTags={setUpdateTags}
									/>
								</Grid.Item>
							))}
					</Grid>
					<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
						<Button square primary>
							<Icon name='plus' size='x20' onClick={(): void => setShowModal(true)} />
						</Button>
					</div>
				</Page.Content>
				<BottomBar />
			</Page>
		</Page>
	);
};

export default BlogView;
