// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Plystra Docs',
			defaultLocale: 'root',
			locales: {
				root: { label: 'English', lang: 'en' },
				zh: { label: '简体中文', lang: 'zh-CN' },
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/plystra/plystra' }],
			sidebar: [
				{
					label: 'Start',
					translations: { zh: '开始' },
					items: [
						{ label: 'Quickstart', translations: { zh: '快速开始' }, slug: 'getting-started' },
					],
				},
				{
					label: 'Concepts',
					translations: { zh: '核心概念' },
					items: [
						{ label: 'Identity and Scope', translations: { zh: '身份与作用域' }, slug: 'concepts/identity-and-scope' },
					],
				},
				{
					label: 'Guides',
					translations: { zh: '指南' },
					items: [
						{ label: 'Self-hosting', translations: { zh: '自托管部署' }, slug: 'guides/self-hosting' },
						{ label: 'HTTP API', translations: { zh: 'HTTP API' }, slug: 'guides/http-api' },
					],
				},
				{
					label: 'Reference',
					translations: { zh: '参考' },
					items: [
						{ label: 'Configuration', translations: { zh: '配置项' }, slug: 'reference/configuration' },
						{ label: 'Database and Migrations', translations: { zh: '数据库与迁移' }, slug: 'reference/database-and-migrations' },
						{ label: 'Release Readiness', translations: { zh: '发布就绪' }, slug: 'reference/release-readiness' },
					],
				},
			],
		}),
	],
});
