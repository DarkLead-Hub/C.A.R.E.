import { NextRequest, NextResponse } from "next/server";
import { getKeysByWallet, upsertKey } from "@/lib/db";

// GET /api/keys?wallet=0x...
export async function GET(request: NextRequest) {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
        return NextResponse.json(
            { error: "Missing wallet query parameter" },
            { status: 400 }
        );
    }

    try {
        const keys = getKeysByWallet(wallet);
        return NextResponse.json({ keys });
    } catch (err: unknown) {
        console.error("Failed to fetch keys:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/keys
// Body: { walletAddress, ipfsCid, aesKeyHex, dataType }
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress, ipfsCid, aesKeyHex, dataType } = body;

        if (!walletAddress || !ipfsCid || !aesKeyHex || !dataType) {
            return NextResponse.json(
                { error: "Missing required fields: walletAddress, ipfsCid, aesKeyHex, dataType" },
                { status: 400 }
            );
        }

        const record = upsertKey(walletAddress, ipfsCid, aesKeyHex, dataType);
        return NextResponse.json({ success: true, record }, { status: 201 });
    } catch (err: unknown) {
        console.error("Failed to store key:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
