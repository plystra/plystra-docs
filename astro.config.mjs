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
					translations: { 'zh-CN': '开始' },
					items: [
						{ label: 'Quickstart', translations: { 'zh-CN': '快速开始' }, slug: 'getting-started' },
						{ label: 'Integrate Your App', translations: { 'zh-CN': '接入你的应用' }, slug: 'guides/integrate-your-app' },
						{ label: 'SDKs', translations: { 'zh-CN': 'SDK' }, slug: 'guides/sdks' },
					],
				},
				{
					label: 'Concepts',
					translations: { 'zh-CN': '核心概念' },
					items: [
						{ label: 'Identity and Scope', translations: { 'zh-CN': '身份与作用域' }, slug: 'concepts/identity-and-scope' },
						{ label: 'Explainable Identity Core', translations: { 'zh-CN': '可解释身份核心' }, slug: 'concepts/explainable-identity-core' },
						{ label: 'Scope Model', translations: { 'zh-CN': '作用域模型' }, slug: 'concepts/scope-model' },
					],
				},
				{
					label: 'Guides',
					translations: { 'zh-CN': '指南' },
					items: [
						{ label: 'HTTP API', translations: { 'zh-CN': 'HTTP API' }, slug: 'guides/http-api' },
						{ label: 'Self-hosting', translations: { 'zh-CN': '自托管部署' }, slug: 'guides/self-hosting' },
					],
				},
				{
					label: 'Reference',
					translations: { 'zh-CN': '参考' },
					items: [
						{ label: 'Configuration', translations: { 'zh-CN': '配置项' }, slug: 'reference/configuration' },
						{ label: 'Database and Migrations', translations: { 'zh-CN': '数据库与迁移' }, slug: 'reference/database-and-migrations' },
						{ label: 'Core API Reference', translations: { 'zh-CN': 'Core API 参考' }, slug: 'reference/core-api' },
						{ label: 'Resource Registry', translations: { 'zh-CN': 'Resource Registry' }, slug: 'reference/resource-registry' },
						{ label: 'Audit Trace', translations: { 'zh-CN': '审计 Trace' }, slug: 'reference/audit-trace' },
						{ label: 'Ent Database Management', translations: { 'zh-CN': 'Ent 数据库管理' }, slug: 'reference/ent-database-management' },
						{ label: 'Release Readiness', translations: { 'zh-CN': '发布就绪' }, slug: 'reference/release-readiness' },
					],
				},
				{
					label: 'Operations',
					translations: { 'zh-CN': '运维' },
					items: [
						{ label: 'Migration and Upgrade Guide', translations: { 'zh-CN': '迁移与升级指南' }, slug: 'operations/migration-and-upgrade-guide' },
					],
				},
				{
					label: 'Compatibility',
					translations: { 'zh-CN': '兼容性' },
					items: [
						{ label: 'Request ID Envelope', translations: { 'zh-CN': 'Request ID Envelope' }, slug: 'compatibility/request-id-envelope' },
					],
				},
				{
					label: 'Examples',
					translations: { 'zh-CN': '示例' },
					items: [
						{ label: 'Identity Trace Demo', translations: { 'zh-CN': '身份 Trace Demo' }, slug: 'examples/identity-trace-demo' },
					],
				},
				{
					label: 'Release',
					translations: { 'zh-CN': '发布' },
					items: [
						{ label: 'v1.0 Readiness', translations: { 'zh-CN': 'v1.0 就绪状态' }, slug: 'release/v1-0-readiness' },
						{ label: 'v1.0 Release Notes', translations: { 'zh-CN': 'v1.0 Release Notes' }, slug: 'release/v1-0-release-notes' },
						{ label: 'v1.0 Readiness Checklist', translations: { 'zh-CN': 'v1.0 发布检查清单' }, slug: 'release/v1-0-readiness-checklist' },
						{ label: 'v1.0 RC Test Plan', translations: { 'zh-CN': 'v1.0 RC 测试计划' }, slug: 'release/v1-0-rc-test-plan' },
					],
				},
			],
		}),
	],
});
