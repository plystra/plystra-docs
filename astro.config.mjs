// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.plystra.com',
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
						{ label: 'Integrate Your App', translations: { zh: '接入你的应用' }, slug: 'guides/integrate-your-app' },
					],
				},
				{
					label: 'Concepts',
					translations: { zh: '核心概念' },
					items: [
						{ label: 'Identity and Scope', translations: { zh: '身份与作用域' }, slug: 'concepts/identity-and-scope' },
						{ label: 'Explainable Identity Core', translations: { zh: '可解释身份核心' }, slug: 'concepts/explainable-identity-core' },
						{ label: 'Scope Model', translations: { zh: '作用域模型' }, slug: 'concepts/scope-model' },
					],
				},
				{
					label: 'Guides',
					translations: { zh: '指南' },
					items: [
						{ label: 'HTTP API', translations: { zh: 'HTTP API' }, slug: 'guides/http-api' },
						{ label: 'Self-hosting', translations: { zh: '自托管部署' }, slug: 'guides/self-hosting' },
					],
				},
				{
					label: 'Reference',
					translations: { zh: '参考' },
					items: [
						{ label: 'Configuration', translations: { zh: '配置项' }, slug: 'reference/configuration' },
						{ label: 'Database and Migrations', translations: { zh: '数据库与迁移' }, slug: 'reference/database-and-migrations' },
						{ label: 'Core API Reference', translations: { zh: 'Core API 参考' }, slug: 'reference/core-api' },
						{ label: 'Resource Registry', translations: { zh: 'Resource Registry' }, slug: 'reference/resource-registry' },
						{ label: 'Audit Trace', translations: { zh: '审计 Trace' }, slug: 'reference/audit-trace' },
						{ label: 'Ent Database Management', translations: { zh: 'Ent 数据库管理' }, slug: 'reference/ent-database-management' },
						{ label: 'Release Readiness', translations: { zh: '发布就绪' }, slug: 'reference/release-readiness' },
					],
				},
				{
					label: 'Operations',
					translations: { zh: '运维' },
					items: [
						{ label: 'Migration and Upgrade Guide', translations: { zh: '迁移与升级指南' }, slug: 'operations/migration-and-upgrade-guide' },
					],
				},
				{
					label: 'Compatibility',
					translations: { zh: '兼容性' },
					items: [
						{ label: 'Request ID Envelope', translations: { zh: 'Request ID Envelope' }, slug: 'compatibility/request-id-envelope' },
					],
				},
				{
					label: 'Examples',
					translations: { zh: '示例' },
					items: [
						{ label: 'Identity Trace Demo', translations: { zh: '身份 Trace Demo' }, slug: 'examples/identity-trace-demo' },
					],
				},
				{
					label: 'Release',
					translations: { zh: '发布' },
					items: [
						{ label: 'v1.0 Readiness', translations: { zh: 'v1.0 就绪状态' }, slug: 'release/v1-0-readiness' },
						{ label: 'v1.0 Release Notes', translations: { zh: 'v1.0 Release Notes' }, slug: 'release/v1-0-release-notes' },
						{ label: 'v1.0 Readiness Checklist', translations: { zh: 'v1.0 发布检查清单' }, slug: 'release/v1-0-readiness-checklist' },
						{ label: 'v1.0 RC Test Plan', translations: { zh: 'v1.0 RC 测试计划' }, slug: 'release/v1-0-rc-test-plan' },
					],
				},
			],
		}),
	],
});
