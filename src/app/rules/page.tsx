import { permanentRedirect } from 'next/navigation';

// 308, not 307: a permanent redirect passes /rules' link equity to /terms.
export default function RulesRedirectPage() {
  permanentRedirect('/terms');
}
