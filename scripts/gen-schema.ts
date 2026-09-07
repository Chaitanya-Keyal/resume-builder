// Writes JSON Schema for the profile and workspace documents.
//   bun scripts/gen-schema.ts   → schema/*.json and static/schema/*.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { profileSchema, PROFILE_SCHEMA_URL } from '../src/lib/core/schema/profile';
import { resumeSchema } from '../src/lib/core/schema/resume';
import { WORKSPACE_SCHEMA_URL, workspaceSchema } from '../src/lib/core/schema/workspace';

const ROOT = join(import.meta.dir, '..');

function emit(name: string, schema: z.ZodType, id: string, title: string) {
	const json = {
		$id: id,
		title,
		...z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input' })
	};
	const text = JSON.stringify(json, null, '\t') + '\n';
	for (const dir of [join(ROOT, 'schema'), join(ROOT, 'static', 'schema')]) {
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, name), text);
	}
	console.log(`wrote ${name} (${(text.length / 1024).toFixed(1)} KB)`);
}

emit('profile-1.json', profileSchema, PROFILE_SCHEMA_URL, 'Resume Builder profile');
emit(
	'resume-1.json',
	resumeSchema,
	'https://resume.okaybro.dev/schema/resume-1.json',
	'Resume Builder composition'
);
emit('workspace-1.json', workspaceSchema, WORKSPACE_SCHEMA_URL, 'Resume Builder workspace');
