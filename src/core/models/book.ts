import { IUrlIcon } from './iconurl';
import { IRatings } from './rating';

export interface IBook {
    isbn13: number;
    authors: string;
    publication: number;
    original_title: string;
    title: string;
    ratings: IRatings;
    icons: IUrlIcon;
    }