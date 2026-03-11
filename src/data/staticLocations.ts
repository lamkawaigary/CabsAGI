
import { Region } from "../types";

export interface StaticLocation {
    placeName: string;
    address: string;
    keywords: string[];
    lat: number;
    lng: number;
    region: Region;
}

export const STATIC_LOCATIONS: StaticLocation[] = [
    // PORTS (Shenzhen)
    { placeName: "深圳灣口岸", address: "Shenzhen Bay Port, Nanshan, Shenzhen", keywords: ["深圳灣", "sz bay", "shenzhen bay", "shenzhenwan"], lat: 22.4908, lng: 113.9436, region: Region.SZ_BAY_PORT },
    // Fix: Map SZ_FUTIAN_PORT and SZ_LUOHU_PORT to existing SZ_CITY_MAIN
    { placeName: "皇崗口岸", address: "Huanggang Port, Futian, Shenzhen", keywords: ["皇崗", "huanggang"], lat: 22.5218, lng: 114.0725, region: Region.SZ_CITY_MAIN }, // Mapped to Futian region logic
    { placeName: "福田口岸", address: "Futian Port, Futian, Shenzhen", keywords: ["福田口岸", "futian port", "落馬洲"], lat: 22.5186, lng: 114.0664, region: Region.SZ_CITY_MAIN },
    { placeName: "羅湖口岸", address: "Luohu Port, Luohu, Shenzhen", keywords: ["羅湖", "luohu"], lat: 22.5296, lng: 114.1136, region: Region.SZ_CITY_MAIN },
    { placeName: "蓮塘口岸", address: "Liantang Port, Luohu, Shenzhen", keywords: ["蓮塘", "liantang"], lat: 22.5539, lng: 114.1565, region: Region.SZ_CITY_MAIN },

    // PORTS (HK/Macau/Zhuhai)
    { placeName: "港珠澳大橋 (香港)", address: "HZMB Hong Kong Port, Chek Lap Kok", keywords: ["hzmb", "港珠澳", "大橋"], lat: 22.3155, lng: 113.9372, region: Region.HK_AIRPORT },
    { placeName: "港珠澳大橋 (珠海)", address: "HZMB Zhuhai Port", keywords: ["珠海口岸", "zhuhai port"], lat: 22.2198, lng: 113.5786, region: Region.ZH_CITY },
    { placeName: "港珠澳大橋 (澳門)", address: "HZMB Macau Port", keywords: ["澳門口岸", "macau port"], lat: 22.2031, lng: 113.5686, region: Region.MO_MACAU },

    // AIRPORTS
    // Fix: GZ_AIRPORT -> GZ_REMOTE and SZ_BAOAN -> SZ_BAOAN_WEST
    { placeName: "香港國際機場 (HKG)", address: "1 Sky Plaza Rd, Chek Lap Kok", keywords: ["hkg", "機場", "airport"], lat: 22.3080, lng: 113.9185, region: Region.HK_AIRPORT },
    { placeName: "廣州白雲機場 (CAN)", address: "Baiyun International Airport, Guangzhou", keywords: ["can", "白雲", "baiyun"], lat: 23.3959, lng: 113.2988, region: Region.GZ_REMOTE },
    { placeName: "深圳寶安機場 (SZX)", address: "Baoan International Airport, Shenzhen", keywords: ["szx", "寶安", "baoan"], lat: 22.6393, lng: 113.8107, region: Region.SZ_BAOAN_WEST },

    // HK LANDMARKS
    { placeName: "香港迪士尼", address: "Hong Kong Disneyland, Lantau Island", keywords: ["disney", "迪士尼"], lat: 22.3130, lng: 114.0413, region: Region.HK_DISNEY },
    { placeName: "海港城", address: "Harbour City, Canton Rd, Tsim Sha Tsui", keywords: ["海港城", "harbour city", "tst", "尖沙咀"], lat: 22.2950, lng: 114.1669, region: Region.HK_KOWLOON },
    { placeName: "時代廣場", address: "Times Square, Causeway Bay", keywords: ["時代廣場", "times square", "cwb", "銅鑼灣"], lat: 22.2782, lng: 114.1823, region: Region.HK_ISLAND },
    { placeName: "K11 MUSEA", address: "Victoria Dockside, 18 Salisbury Rd, Tsim Sha Tsui", keywords: ["k11", "musea"], lat: 22.2933, lng: 114.1736, region: Region.HK_KOWLOON },
    { placeName: "國際金融中心 (IFC)", address: "IFC Mall, 8 Finance St, Central", keywords: ["ifc", "中環", "central"], lat: 22.2849, lng: 114.1587, region: Region.HK_ISLAND },
    { placeName: "環球貿易廣場 (ICC)", address: "ICC, 1 Austin Rd W, West Kowloon", keywords: ["icc", "west kowloon", "西九"], lat: 22.3034, lng: 114.1602, region: Region.HK_KOWLOON },

    // GBA LANDMARKS
    // Fix: GZ_SOUTH -> GZ_CITY
    { placeName: "廣州南站", address: "Guangzhou South Railway Station", keywords: ["廣州南", "gz south"], lat: 22.9868, lng: 113.2680, region: Region.GZ_CITY },
    { placeName: "澳門威尼斯人", address: "The Venetian Macao", keywords: ["venetian", "威尼斯人", "macau"], lat: 22.1485, lng: 113.5597, region: Region.MO_MACAU },
    { placeName: "珠海長隆", address: "Chimelong Ocean Kingdom, Zhuhai", keywords: ["chimelong", "長隆"], lat: 22.0970, lng: 113.5298, region: Region.ZH_CITY },
    { placeName: "廣州塔", address: "Canton Tower, Haizhu, Guangzhou", keywords: ["canton tower", "廣州塔", "小蠻腰"], lat: 23.1065, lng: 113.3246, region: Region.GZ_CITY },
];
