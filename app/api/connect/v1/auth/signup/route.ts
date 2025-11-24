import { NextRequest } from 'next/server';

import { tradSignup } from '@/lib/authFunctions';

export async function POST(req: NextRequest) {
    return await tradSignup(req);
}
