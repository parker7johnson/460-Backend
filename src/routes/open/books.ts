//express is the framework we're going to use to handle requests
import express, { Request, Response, Router } from 'express';
//Access the connection to Postgres Database
import { pool } from '../../core/utilities';

const booksRouter: Router = express.Router();

// Testing stuffs - Minh
const format = (resultRow) =>
    `${resultRow.isbn13} - {${resultRow.authors}} - [${resultRow.publication_year}] - [${resultRow.original_title}] - [${resultRow.title}] - [${resultRow.rating_avg}] - [${resultRow.image_small_url}]`;

/**
 * @api {get} /books Request to all retrieve entries
 *
 * @apiDescription Request to retrieve all the entries
 *
 * @apiName GetAllBooks
 * @apiGroup Books
 *
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 */
booksRouter.get('/all', (request: Request, response: Response) => {
    const theQuery =
        'SELECT isbn13, authors, publication_year, original_title, title, rating_avg, image_small_url FROM books';
    pool.query(theQuery)
        .then((result) => {
            response.send({
                entries: result.rows.map(format),
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET all');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

// "return" the router
export { booksRouter };
