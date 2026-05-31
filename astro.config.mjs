// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.plystra.com',
	integrations: [
		starlight({
			title: 'Plystra Docs',
			logo: {
				src: './src/assets/plystra.svg',
				alt: 'Plystra',
			},
			favicon: '/plystra.svg',
			customCss: ['./src/styles/plystra.css'],
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
						{ label: 'Implementation Map', translations: { 'zh-CN': '实现地图' }, slug: 'reference/implementation-map' },
						{ label: 'Quickstart', translations: { 'zh-CN': '快速开始' }, slug: 'getting-started' },
						{
							label: 'Developer Handbook',
							translations: { 'zh-CN': '开发者手册' },
							items: [
								{ label: 'Overview', translations: { 'zh-CN': '总览' }, slug: 'guides/developer-handbook' },
								{ label: 'Model and Architecture', translations: { 'zh-CN': '模型与生产架构' }, slug: 'guides/developer-handbook/model-and-architecture' },
								{ label: 'Local Setup and Bootstrap', translations: { 'zh-CN': '本地启动与 Bootstrap' }, slug: 'guides/developer-handbook/local-bootstrap' },
								{ label: 'Authorization Model', translations: { 'zh-CN': '授权模型' }, slug: 'guides/developer-handbook/authorization-model' },
								{ label: 'Integration Path', translations: { 'zh-CN': '可复制接入流程' }, slug: 'guides/developer-handbook/integration-path' },
								{ label: 'API Keys and Admin Grants', translations: { 'zh-CN': 'API Key 与 AdminGrant' }, slug: 'guides/developer-handbook/api-keys-and-admin-grants' },
								{ label: 'SDKs and Errors', translations: { 'zh-CN': 'SDK 与错误处理' }, slug: 'guides/developer-handbook/sdk-and-errors' },
								{ label: 'Production Checklist', translations: { 'zh-CN': '生产检查与排错' }, slug: 'guides/developer-handbook/production-checklist' },
							],
						},
						{ label: 'Integrate Your App', translations: { 'zh-CN': '接入你的应用' }, slug: 'guides/integrate-your-app' },
						{ label: 'SDKs', translations: { 'zh-CN': 'SDK' }, slug: 'guides/sdks' },
						{ label: 'OpenAPI', translations: { 'zh-CN': 'OpenAPI' }, slug: 'reference/openapi' },
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
						{ label: 'Backend OS Alpha Templates', translations: { 'zh-CN': 'Backend OS Alpha Templates' }, slug: 'guides/backend-os-alpha-templates' },
						{ label: 'Self-hosting', translations: { 'zh-CN': '自托管部署' }, slug: 'guides/self-hosting' },
					],
				},
				{
					label: 'Reference',
					translations: { 'zh-CN': '参考' },
					items: [
						{ label: 'Implementation Map', translations: { 'zh-CN': '实现地图' }, slug: 'reference/implementation-map' },
						{ label: 'OpenAPI', translations: { 'zh-CN': 'OpenAPI' }, slug: 'reference/openapi' },
						{ label: 'Complete Auth Plugin', translations: { 'zh-CN': 'Complete Auth Plugin' }, slug: 'reference/complete-auth-plugin' },
						{ label: 'Plugins and Capabilities', translations: { 'zh-CN': 'Plugins and Capabilities' }, slug: 'reference/plugins-and-capabilities' },
						{ label: 'Configuration', translations: { 'zh-CN': '配置项' }, slug: 'reference/configuration' },
						{ label: 'Database and Migrations', translations: { 'zh-CN': '数据库与迁移' }, slug: 'reference/database-and-migrations' },
						{ label: 'Core API Reference', translations: { 'zh-CN': 'Core API 参考' }, slug: 'reference/core-api' },
						{ label: 'Admin Auth and Security', translations: { 'zh-CN': 'Admin Auth 与安全边界' }, slug: 'reference/admin-auth-and-security' },
						{ label: 'System Capabilities', translations: { 'zh-CN': 'System Capabilities' }, slug: 'reference/system-capabilities' },
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
