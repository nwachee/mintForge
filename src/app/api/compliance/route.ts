// app/api/compliance/route.ts
import { v4 as uuidv4 } from "uuid"

interface ComplianceRequestBody {
    address: string
}

interface CircleScreeningResult {
    result: "APPROVED" | "DENIED" | "UNKNOWN"
    message?: string
}

interface CircleApiResponse {
    data?: CircleScreeningResult
}

const json = (data: unknown, status = 200) => Response.json(data, { status })

export async function POST(request: Request): Promise<Response> {
    try {
        const { address } = (await request.json()) as ComplianceRequestBody

        if (!address) {
            return json({ success: false, message: "Address is required" }, 400)
        }

        if (process.env.ENABLE_COMPLIANCE_CHECK !== "true") {
            console.log("Compliance checking disabled, auto-approving:", address)
            return json({
                success: true,
                isApproved: true,
                data: { result: "APPROVED" as const, message: "Compliance checking is disabled" },
            })
        }

        const apiKey = process.env.CIRCLE_API_KEY

        if (!apiKey) {
            console.error("Missing CIRCLE_API_KEY environment variable")
            return json({ success: false, message: "Server configuration error" }, 500)
        }

        const response = await fetch(
            "https://api.circle.com/v1/w3s/compliance/screening/addresses",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    idempotencyKey: uuidv4(),
                    address,
                    chain: "ETH-SEPOLIA",
                }),
            }
        )

        const data = (await response.json()) as CircleApiResponse

        return json({
            success: true,
            isApproved: data?.data?.result === "APPROVED",
            data: data?.data,
        })
    } catch (error) {
        console.error("Compliance check error:", error)
        return json({ success: false, message: "Failed to process compliance check" }, 500)
    }
}
