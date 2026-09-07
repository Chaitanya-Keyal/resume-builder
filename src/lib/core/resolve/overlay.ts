import type { Overlay, Profile } from '../schema/types';
import { lookupRef } from './refs';

/** Profile with private fields merged in. Never persisted or exported as the profile. */
export function applyOverlay(profile: Profile, overlay: Overlay | undefined): Profile {
	if (!overlay) return profile;
	const out: Profile = structuredClone(profile);
	if (overlay.basics) {
		const { phone, email, url, location } = overlay.basics;
		if (phone) out.basics.phone = phone;
		if (email) out.basics.email = email;
		if (url) out.basics.url = url;
		if (location) out.basics.location = { ...out.basics.location, ...location };
	}
	for (const patch of overlay.patches ?? []) {
		const hit = lookupRef(out, patch.ref);
		if (!hit) continue;
		const target = ('position' in hit ? hit.position : hit.item) as unknown as Record<
			string,
			unknown
		>;
		for (const [k, v] of Object.entries(patch.fields)) if (k !== 'id') target[k] = v;
	}
	return out;
}
