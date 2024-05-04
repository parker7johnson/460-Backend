// express is the framework we're going to use to handle requests
import express, { Request, Response, Router } from 'express';
// Access the connection to Postgres Database
import { pool } from '../../core/utilities';

const booksRouter: Router = express.Router();

const getAllBooksQuery =        
    'SELECT * FROM books';


//helper function to convert entry to proper format as specified in assignment document.
const entryToBook = (entry) => {
    return {
        isbn13: entry.isbn13,
        authors: entry.authors,
        publication: entry.publication_year,
        original_title: entry.original_title,
        title: entry.title,
        ratings: {
            average: entry.rating_avg,
            count: entry.rating_count,
            rating_1: entry.rating_1_star,
            rating_2: entry.rating_2_star,
            rating_3: entry.rating_3_star,
            rating_4: entry.rating_4_star,
            rating_5: entry.rating_5_star,
        },
        icons: {
            large: entry.image_url,
            small: entry.image_small_url
        }
    };
};

/**
 * @api {get} /books/all Retrieve all books with pagination
 * @apiName GetAllBooks
 * @apiGroup Books
 *
 * @apiBody {Number} [page=1] Page number (default is 1)
 * @apiBody {Number} [limit=10] Number of books per page (default is 10)
 *
 * @apiSuccess {IBook[]} books Array of IBook objects
 * @apiError {401} Invalid or missing Token
 * @apiError {403} Invalid or missing Authorization
 * @apiError {500} Server error
 */
booksRouter.get('/all', (req: Request, res: Response) => {
    const page: number = parseInt(req.body.page as string) || 1;
    const limit: number = parseInt(req.body.limit as string) || 10;
    const offset: number = (page - 1) * limit;
    const query = getAllBooksQuery +` order by isbn13 LIMIT $1 OFFSET $2`;

    pool.query(query, [limit, offset])
        .then((result) => {
            res.json({ books: result.rows.map(entryToBook) });
        })
        .catch((error) => {
            console.error('DB Query error on GET all');
            console.error(error);
            res.status(500).json({ error: 'Server error - contact support' });
        });

});


/**
 * @api {get} /rating Retrieve books by rating
 * @apiName GetBooksByRating
 * @apiGroup Books
 *
 * @apiQuery {Number} [rating] Rating of the book
 *
 * @apiSuccess {IBook[]} books Array of IBook objects above a certain rating
 * @apiError {400} Invalid or missing rating
 * @apiError {401} Invalid or missing Token
 * @apiError {403} Invalid or missing Authorization
 * @apiError {500} Server error
 */
booksRouter.get('/rating', (request: Request, response: Response) => {
    const theQuery =
        getAllBooksQuery + ' WHERE rating_avg > $1';
    
    let values;
    if (validRating(request.query.rating) && request.query.rating) {
        values = [request.query.rating];
    } else {
        response.status(400).send({
            message: 'Invalid or missing rating  - please refer to documentation',
        });
        return;
    }
    pool.query(theQuery, values)
        .then((result) => {
            result.rows = result.rows.map(entryToBook);
            response.send({
                books: result.rows
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET by rating');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

const validRating = (rating) => {
    return rating >= 1 && rating <= 5;
};



/**
 * @api {get} /pub_year Retrieve book by Publication Year
 * @apiName GetBooksByPublicationYear
 * 
 * @apiGroup Books
 * 
 * @apiQuery {Number} year Year of the book
 * 
 * @apiSuccess {IBook[]} books Array of IBook objects above a certain year
 * @apiError {400} Invalid or missing year
 * @apiError {401} Invalid or missing Token
 * @apiError {403} Invalid or missing Authorization
 * @apiError {500} Server error
 */
booksRouter.get("/pub_year", (request: Request, response: Response) => {
    const theQuery = getAllBooksQuery + " WHERE publication_year = $1";
    let values;
    if (isValidYear(parseInt(request.query.year as string)) && request.query.year) {
        values = [request.query.year];
    } else {
        response.status(400).send({
            message: 'Invalid or missing year  - please refer to documentation',
        });
        return;
    }

    pool.query(theQuery, values)
        .then((result) => {
            result.rows = result.rows.map(entryToBook);
            response.send({
                books: result.rows
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET by year');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
})

const isValidYear = (year) => {
    return year.toString().length === 4 && year > 0 && year <= new Date().getFullYear();
}



/**
 * @api {get} /books/authors Retrieve books by Author
 * @apiName GetBooksByAuthor
 * @apiGroup Books
 * @apiQuery {String} author Author's name
 * @apiSuccess {IBook[]} books Array of IBook objects written by the author
 * @apiError {400} Invalid or missing author
 * @apiError {401} Invalid or missing Token
 * @apiError {403} Invalid or missing Authorization
 * @apiError {500} Server error
 */
booksRouter.get("/authors", (request: Request, response: Response) => {
    const authorName: string = request.query.author as string;

    if (!authorName) {
        response.status(400).send({
            message: 'Invalid or missing author name - please refer to documentation',
        });
        return;
    }

    const theQuery = getAllBooksQuery + " WHERE authors ILIKE $1";
    const partialAuthorName = `%${authorName}%`; // Partial match for author's name

    pool.query(theQuery, [partialAuthorName])
        .then((result) => {
            result.rows = result.rows.map(entryToBook);
            response.send({
                books: result.rows
            });
        })
        .catch((error) => {
            // Log the error
            console.error('DB Query error on GET by authors');
            console.error(error);
            response.status(500).send({
                message: 'Server error - contact support',
            });
        });
});

/**
 * @api {get} /books/title Retrieve books by title
 * @apiName GetBooksByTitle
 * @apiGroup Books
 * @apiQuery {String} title title of the book
 * @apiSuccess {IBook[]} books Array of IBook objects with titles containing the provided partial title
 * @apiError {400} Invalid or missing title
 * @apiError {401} Invalid or missing Token
 * @apiError {403} Invalid or missing Authorization
 * @apiError {500} Server error
 */

booksRouter.get("/title", (request: Request, response: Response) => {
    const partialTitle: string = request.query.title as string;

    if (!partialTitle) {
        response.status(400).send({
            message: 'Invalid or missing title - please refer to documentation',
        });
        return;
    }

    const theQuery = getAllBooksQuery + " WHERE title ILIKE $1";
    const partialTitleParam = `%${partialTitle}%`;

    pool.query(theQuery, [partialTitleParam])
        .then((result) => {
            result.rows = result.rows.map(entryToBook);
            response.send({
                books: result.rows
            });
        })
        .catch((error) => {
            console.error('DB Query error on GET by title');
            console.error(error);
            response.status(500).send({
                message: 'Server error - contact support',
            });
        });
});

// "return" the router
export { booksRouter };
