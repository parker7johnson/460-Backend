// express is the framework we're going to use to handle requests
import express, { Request, Response, Router } from 'express';
// Access the connection to Postgres Database
import { pool } from '../../core/utilities';

const booksRouter: Router = express.Router();

const getAllBooksQuery = 'SELECT * FROM books';

const getBooksByISBNQuery = `
    SELECT 
    TITLE, 
    AUTHORS, 
    PUBLICATION_YEAR, 
    ORIGINAL_TITLE, 
    RATING_AVG, IMAGE_URL, 
    IMAGE_SMALL_URL 
    FROM BOOKS WHERE ISBN13 = `;

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
            small: entry.image_small_url,
        },
    };
};
/**
 * @api {put} /books/update-rating/:id Update a book's rating by ID
 * @apiName UpdateBookRatingById
 * @apiGroup Books
 *
 * @apiParam {String} id ID of the book to update
 * @apiParam {Object} ratings New ratings data for the book
 *
 * @apiSuccess {String} message Success message
 * @apiError {400} Invalid request parameters
 * @apiError {404} Book not found
 * @apiError {500} Server error
 */
booksRouter.put('/update-rating/:id', (req: Request, res: Response) => {
    const { id } = req.params; // Get book ID from URL parameter
    const { ratings } = req.body;

    // Validate request parameters
    if (
        !id ||
        !ratings ||
        typeof ratings !== 'object' ||
        !isValidRatingsData(ratings)
    ) {
        res.status(400).json({ message: 'Invalid request parameters' });
        return;
    }

    const { average, count } = calculateAverageRating(ratings);

    const values = [average, count, ...getRatingValues(ratings), id];

    // Update the book's ratings in the database by ID
    const updateQuery = `
        UPDATE books
        SET rating_avg = $1,
            rating_count = $2,
            rating_1_star = $3,
            rating_2_star = $4,
            rating_3_star = $5,
            rating_4_star = $6,
            rating_5_star = $7
        WHERE id = $8
    `;

    pool.query(updateQuery, values)
        .then((result) => {
            if (result.rowCount === 0) {
                res.status(404).json({ message: 'Book not found' });
            } else {
                res.json({ message: 'Book rating updated successfully' });
            }
        })
        .catch((error) => {
            console.error('DB Query error on updating book rating');
            console.error(error);
            res.status(500).json({ error: 'Server error - contact support' });
        });
});

/**
 * @api {put} /books/update-rating Update a book's rating
 * @apiName UpdateBookRating
 * @apiGroup Books
 *
 * @apiParam {String} isbn13 ISBN-13 of the book
 * @apiParam {Object} ratings New ratings data for the book
 *
 * @apiSuccess {String} message Success message
 * @apiError {400} Invalid request parameters
 * @apiError {404} Book not found
 * @apiError {500} Server error
 */
booksRouter.put('/update-rating', (req: Request, res: Response) => {
    const { isbn13, ratings } = req.body;

    // Validate request parameters
    if (
        !isbn13 ||
        !ratings ||
        typeof ratings !== 'object' ||
        !isValidRatingsData(ratings)
    ) {
        res.status(400).json({ message: 'Invalid request parameters' });
        return;
    }

    const { average, count } = calculateAverageRating(ratings);

    const values = [average, count, ...getRatingValues(ratings), isbn13];

    // Update the book's ratings in the database
    const updateQuery = `
        UPDATE books
        SET rating_avg = $1,
            rating_count = $2,
            rating_1_star = $3,
            rating_2_star = $4,
            rating_3_star = $5,
            rating_4_star = $6,
            rating_5_star = $7
        WHERE isbn13 = $8
    `;

    pool.query(updateQuery, values)
        .then((result) => {
            if (result.rowCount === 0) {
                res.status(404).json({ message: 'Book not found' });
            } else {
                res.json({ message: 'Book rating updated successfully' });
            }
        })
        .catch((error) => {
            console.error('DB Query error on updating book rating');
            console.error(error);
            res.status(500).json({ error: 'Server error - contact support' });
        });
});

// function checking for valid ratings input (integer)
function isValidRatingsData(ratings) {
    return (
        typeof ratings.average === 'number' &&
        validRating(ratings.average) &&
        typeof ratings.count === 'number' &&
        typeof ratings.rating_1 === 'number' &&
        typeof ratings.rating_2 === 'number' &&
        typeof ratings.rating_3 === 'number' &&
        typeof ratings.rating_4 === 'number' &&
        typeof ratings.rating_5 === 'number'
    );
}

// helper function to calculate the average rating and rating count
function calculateAverageRating(ratings) {
    const total =
        ratings.rating_1 +
        ratings.rating_2 * 2 +
        ratings.rating_3 * 3 +
        ratings.rating_4 * 4 +
        ratings.rating_5 * 5;
    const count =
        ratings.rating_1 +
        ratings.rating_2 +
        ratings.rating_3 +
        ratings.rating_4 +
        ratings.rating_5;
    const average = total / count;
    return { average, count };
}

// helper function to return a list of ratings 1-5
function getRatingValues(ratings) {
    return [
        ratings.rating_1,
        ratings.rating_2,
        ratings.rating_3,
        ratings.rating_4,
        ratings.rating_5,
    ];
}

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
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 10000;
    const offset: number = (page - 1) * limit;
    const query = getAllBooksQuery + ` order by isbn13 LIMIT $1 OFFSET $2`;

    pool.query(query, [limit, offset])
        .then((result) => {
            res.json({ books: result.rows.map(entryToBook) });
        })
        .catch((error) => {
            console.error('DB Query error on GET all');
            console.error(error);
            res.status(500).json({
                error: 'Server error - contact support please',
            });
        });
});

/**
 * @api {get} /books/ISBN get book by specific ISBN
 * @apiName GetBookByISBN
 * @apiGroup Books
 * @apiQuery {String} isbn13 Book's ISBN
 * @apiSuccess {IBook[]} books Array of IBook objects
 * @apiError {401} Invalid or missing Token
 * @apiError {403} Invalid or missing Authorization
 * @apiError {500} Server error
 */
booksRouter.get('/ISBN', (req: Request, res: Response) => {
    const isbn13: string = req.query.isbn as string;
    if (!isbn13 || isbn13.length != 13) {
        res.status(400).send({
            message: 'Invalid or missing ISBN - please refer to documentation',
        });
        return;
    }

    const theQuery = getAllBooksQuery + ` WHERE isbn13 = $1 ;`;
    const isbn = `${isbn13}`;

    pool.query(theQuery, [isbn])
        .then((result) => {
            result.rows = result.rows.map(entryToBook);
            res.send({
                books: result.rows,
            });
        })
        .catch((error) => {
            // Log the error
            console.error('DB Query error on GET by ISBN');
            console.error(error);
            res.status(500).send({
                message: 'Server error - contact support',
            });
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
 * @apiError (400 : Invalid or missing Rating) {String} Invalid or missing rating- please refer to documentation
 * @apiError (401 : Invalid or missing Token) {String} Invalid or missing Token
 * @apiError (403 : Invalid or missing Authorization) {String} Invalid or missing Authorization
 * @apiError (500 : Server error) {String} server error - contact support
 */
booksRouter.get('/rating', (request: Request, response: Response) => {
    const theQuery = getAllBooksQuery + ' WHERE rating_avg > $1';

    let values;
    if (validRating(request.query.rating) && request.query.rating) {
        values = [request.query.rating];
    } else {
        response.status(400).send({
            message:
                'Invalid or missing rating  - please refer to documentation',
        });
        return;
    }
    pool.query(theQuery, values)
        .then((result) => {
            result.rows = result.rows.map(entryToBook);
            response.send({
                books: result.rows,
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
 * @apiError (400 : Invalid or missing Year) {String} Invalid or missing year
 * @apiError (401 : Invalid or missing Token) {String} Invalid or missing Token
 * @apiError (403 : Invalid or missing Authorization) {String} Invalid or missing Authorization
 * @apiError (500 : Server error) {String} server error - contact support
 */
booksRouter.get('/pub_year', (request: Request, response: Response) => {
    const theQuery = getAllBooksQuery + ' WHERE publication_year = $1';
    let values;
    if (
        isValidYear(parseInt(request.query.year as string)) &&
        request.query.year
    ) {
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
                books: result.rows,
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
});

const isValidYear = (year) => {
    return (
        year.toString().length === 4 &&
        year > 0 &&
        year <= new Date().getFullYear()
    );
};

/**
 * @api {delete} /delete Delete one book by ISBN13
 * @apiName DeleteBookByISBN
 *
 * @apiGroup Books
 *
 * @apiBody isbn13 is isbn13 as string
 *
 * @apiSuccess {Number} numDeleted The number of books deleted
 * @apiError (400 : Invalid request body) {String} Invalid request body - please refer to documentation
 * @apiError (400 : Invalid ISBN13 inrequest body) {String} Invalid ISBN13 inrequest body - please refer to documentation
 * @apiError (401 : Invalid or missing Token) {String} Invalid or missing Token
 * @apiError (403 : Invalid or missing Authorization) {String} Invalid or missing Authorization
 * @apiError (500 : Server error) {String} server error - contact support
 */
booksRouter.delete('/delete', (req: Request, res: Response) => {
    const isbn13 = req.body.isbn13;
    //const isbn13: string = req.query.isbn as string;
    if (!isbn13) {
        res.status(400).json({
            message: 'Invalid request body - please refer to documentation',
        });
        return;
    }
    let invalidISBN = false;
    if (!isbn13) {
        invalidISBN = true;
    }
    if (invalidISBN) {
        res.status(400).json({
            message:
                'Invalid ISBN13 in request body - please refer to documentation',
        });
        return;
    }
    const query = 'delete from books where isbn13 = $1';
    pool.query(query, [isbn13])
        .then((result) => {
            res.send({
                numDeleted: result.rowCount,
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on delete');
            console.error(error);
            res.status(500).json({ error: 'Server error - contact support' });
        });
});

/**
 * @api {delete} /multiple_delete Delete multiple books by ISBN13
 * @apiName DeleteMultipleBooks
 *
 * @apiGroup Books
 *
 * @apiBody {Array} isbn13s Array of isbn13s as strings
 *
 * @apiSuccess {Number} numDeleted The number of books deleted
 * @apiError (400 : Invalid request body) {String} Invalid request body - please refer to documentation
 * @apiError (400 : Invalid ISBN13 inrequest body) {String} Invalid ISBN13 inrequest body - please refer to documentation
 * @apiError (401 : Invalid or missing Token) {String} Invalid or missing Token
 * @apiError (403 : Invalid or missing Authorization) {String} Invalid or missing Authorization
 * @apiError (500 : Server error) {String} server error - contact support
 */
booksRouter.delete('/multiple_delete', (req: Request, res: Response) => {
    const { isbn13s } = req.body;
    if (!isbn13s || !Array.isArray(isbn13s)) {
        res.status(400).json({
            message: 'Invalid request body - please refer to documentation',
        });
        return;
    }
    let invalidISBN = false;
    isbn13s.forEach((isbn13) => {
        if (!isbn13 || typeof isbn13 !== 'string' || isbn13.length !== 13) {
            invalidISBN = true;
        }
    });

    if (invalidISBN) {
        res.status(400).json({
            message:
                'Invalid ISBN13 in request body - please refer to documentation',
        });
        return;
    }
    const query = 'delete from books where isbn13 = any($1)';
    pool.query(query, [isbn13s])
        .then((result) => {
            res.send({
                numDeleted: result.rowCount,
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on delete');
            console.error(error);
            res.status(500).json({ error: 'Server error - contact support' });
        });
});

/**
 * @api {get} /books/authors Retrieve books by Author
 * @apiName GetBooksByAuthor
 * @apiGroup Books
 * @apiQuery {String} author Author's name
 * @apiSuccess {IBook[]} books Array of IBook objects written by the author
 * @apiError (400 : Invalid or missing author) {String} Invalid or missing author
 * @apiError (401 : Invalid or missing Token) {String} Invalid or missing Token
 * @apiError (403 : Invalid or missing Authorization) {String} Invalid or missing Authorization
 * @apiError (500 : Server error) {String} server error - contact support
 */
booksRouter.get('/authors', (request: Request, response: Response) => {
    const authorName: string = request.query.author as string;

    if (!authorName) {
        response.status(400).send({
            message:
                'Invalid or missing author name - please refer to documentation',
        });
        return;
    }

    const theQuery = getAllBooksQuery + ' WHERE authors ILIKE $1';
    const partialAuthorName = `%${authorName}%`; // Partial match for author's name

    pool.query(theQuery, [partialAuthorName])
        .then((result) => {
            result.rows = result.rows.map(entryToBook);
            response.send({
                books: result.rows,
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
 * @apiError (400 : Invalid or missing title) {String} Invalid or missing title
 * @apiError (401 : Invalid or missing Token) {String} Invalid or missing Token
 * @apiError (403 : Invalid or missing Authorization) {String} Invalid or missing Authorization
 * @apiError (500 : Server error) {String} server error - contact support
 */

booksRouter.get('/title', (request: Request, response: Response) => {
    const partialTitle: string = request.query.title as string;

    if (!partialTitle) {
        response.status(400).send({
            message: 'Invalid or missing title - please refer to documentation',
        });
        return;
    }

    const theQuery = getAllBooksQuery + ' WHERE title ILIKE $1';
    const partialTitleParam = `%${partialTitle}%`;

    pool.query(theQuery, [partialTitleParam])
        .then((result) => {
            result.rows = result.rows.map(entryToBook);
            response.send({
                books: result.rows,
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




/**
 * @api {post} /books/add Add a book to the database
 * @apiName AddBook
 * @apiGroup Books
 *
 * @apiParam {Number} isbn13 ISBN-13 of the book
 * @apiParam {String} authors Authors of the book
 * @apiParam {Number} publication_year Publication year of the book
 * @apiParam {String} original_title Original title of the book
 * @apiParam {String} title Title of the book
 * @apiParam {Number} rating_avg Average rating of the book
 * @apiParam {Number} rating_count Total count of ratings for the book
 * @apiParam {Number} rating_1_star Number of 1-star ratings
 * @apiParam {Number} rating_2_star Number of 2-star ratings
 * @apiParam {Number} rating_3_star Number of 3-star ratings
 * @apiParam {Number} rating_4_star Number of 4-star ratings
 * @apiParam {Number} rating_5_star Number of 5-star ratings
 * @apiParam {String} image_url URL of the book's image
 * @apiParam {String} image_small_url URL of the small-sized book's image
 *
 * @apiSuccess (201: Book Added) {String} message Success message
 * @apiError (400: Invalid Request Parameters) {String} Invalid request parameters
 * @apiError (401 : Invalid or missing Token) {String} Invalid or missing Token
 * @apiError (403 : Invalid or missing Authorization) {String} Invalid or missing Authorization
 * @apiError (500: Server Error) {String} server error - contact support
 */


booksRouter.post('/add', (request: Request, response: Response) => {
    const {
        isbn13,
        authors,
        publication_year,
        original_title,
        title,
        rating_avg,
        rating_count,
        rating_1_star,
        rating_2_star,
        rating_3_star,
        rating_4_star,
        rating_5_star,
        image_url,
        image_small_url
    } = request.body;

    // Validate the request body
    if (!isbn13 || !authors || !publication_year || !original_title || !title || !rating_avg || !rating_count || !rating_1_star || !rating_2_star || !rating_3_star || !rating_4_star || !rating_5_star || !image_url || !image_small_url) {
        return response.status(400).json({ error: 'Invalid or missing data' });
    }

    const query = `
        INSERT INTO books (
            isbn13, authors, publication_year, original_title, title, rating_avg, rating_count, 
            rating_1_star, rating_2_star, rating_3_star, rating_4_star, rating_5_star, image_url, image_small_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;

    const values = [
        isbn13, authors, publication_year, original_title, title, rating_avg, rating_count,
        rating_1_star, rating_2_star, rating_3_star, rating_4_star, rating_5_star, image_url, image_small_url
    ];

    pool.query(query, values)
        .then(() => {
            console.log('Book added successfully');
            response.status(201).json({ message: 'Book added successfully' });
        })
        .catch((error) => {
            console.error('DB Query error on INSERT book');
            console.error(error);
            response.status(500).json({ error: 'Server error - contact support' });
        });
});

export { booksRouter };
