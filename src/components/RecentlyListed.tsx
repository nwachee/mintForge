import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import NFTBox from "./NFTBox"
import Link from "next/link"

const GRAPHQL_ENDPOINT =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:3001/graphql"

const ACTIVE_LISTINGS_QUERY = `
  query GetActiveListings {
    allItemListeds(orderBy: BLOCK_TIMESTAMP_DESC) {
      nodes {
        nodeId
        rindexerId
        seller
        nftAddress
        tokenId
        price
        contractAddress
        network
        blockTimestamp
        txHash
      }
    }
    allItemBoughts {
      nodes {
        nftAddress
        tokenId
        contractAddress
        network
      }
    }
    allItemCanceleds {
      nodes {
        nftAddress
        tokenId
        contractAddress
        network
      }
    }
  }
`

interface ItemListed {
    nodeId: string
    rindexerId: number
    seller: string | null
    nftAddress: string | null
    tokenId: string | null
    price: string | null
    contractAddress: string
    network: string
    blockTimestamp: string | null
    txHash: string
}

interface InactiveItem {
    nftAddress: string | null
    tokenId: string | null
    contractAddress: string
    network: string
}

interface ListingsData {
    allItemListeds: { nodes: ItemListed[] }
    allItemBoughts: { nodes: InactiveItem[] }
    allItemCanceleds: { nodes: InactiveItem[] }
}

async function fetchListingsData(): Promise<ListingsData> {
    const res = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ACTIVE_LISTINGS_QUERY }),
    })

    if (!res.ok) throw new Error(`Network error: ${res.status}`)

    const { data, errors } = await res.json()
    if (errors?.length) throw new Error(errors[0].message)

    return data
}

function listingKey(item: InactiveItem) {
    return `${item.nftAddress?.toLowerCase()}-${item.tokenId}-${item.contractAddress?.toLowerCase()}-${item.network}`
}

export default function RecentlyListedNFTs() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["activeListings"],
        queryFn: fetchListingsData,
        refetchInterval: 30_000,
    })

    const activeListings = useMemo(() => {
        if (!data) return []

        const { allItemListeds, allItemBoughts, allItemCanceleds } = data

        const inactiveKeys = new Set([
            ...allItemBoughts.nodes.map(listingKey),
            ...allItemCanceleds.nodes.map(listingKey),
        ])

        return allItemListeds.nodes.filter(
            (listing) => !inactiveKeys.has(listingKey(listing))
        )
    }, [data])

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Recently Listed NFTs</h2>
                <Link
                    href="/list-nft"
                    className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    List Your NFT
                </Link>
            </div>

            {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="border rounded-lg overflow-hidden shadow-md animate-pulse"
                        >
                            <div className="aspect-square bg-gray-200" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isError && (
                <div className="text-center py-12 text-red-500">
                    <p>Failed to load listings: {(error as Error).message}</p>
                </div>
            )}

            {!isLoading && !isError && activeListings.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>No active listings at the moment.</p>
                </div>
            )}

            {activeListings.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {activeListings.map((listing) => (
                        <NFTBox
                            key={listing.nodeId}
                            tokenId={listing.tokenId ?? ""}
                            price={listing.price ?? "0"}
                            contractAddress={listing.nftAddress ?? listing.contractAddress}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}