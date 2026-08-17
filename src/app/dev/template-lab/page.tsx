/**
 * TEMPLATE LAB — Dev-only route page
 *
 * Returns 404 in production. Never publicly accessible.
 * This file intentionally lives outside the main editor flow.
 */

import { notFound } from 'next/navigation';
import TemplateLabClient from '@/components/template-lab/TemplateLabClient';
import FontLoader from '@/components/template-lab/FontLoader';

export const metadata = {
  title: 'Template Lab [DEV]',
  robots: { index: false, follow: false },
};

export default function TemplateLabPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return (
    <FontLoader>
      <TemplateLabClient />
    </FontLoader>
  );
}
