export type Category = { id: number; name: string };
export type Product = {
id: number;
name: string;
description: string | null;
price: number | string;
stock: number | null;
created_at: string;
category_id?: number | null;
category_name?: string | null;
};


export type Paged<T> = {
items: T[];
meta: {
page: number;
limit: number;
total: number;
totalPages: number;
sort?: string;
};
};