// express is the framework we're going to use to handle requests
import express, { Request, Response, Router } from 'express';
// Access the connection to Postgres Database
import { pool } from '../../core/utilities';

const booksRouter: Router = express.Router();

/**
 * @api {get} /books/all Retrieve all books with pagination
 * @apiName GetAllBooks
 * @apiGroup Books
 *
 * @apiParam {Number} [page=1] Page number (default is 1)
 * @apiParam {Number} [limit=10] Number of books per page (default is 10)
 *
 * @apiSuccess {Object[]} books Array of book objects
 * @apiSuccess {Number} books.isbn13 ISBN-13 of the book
 * @apiSuccess {String} books.authors Authors of the book
 * @apiSuccess {Number} books.publication_year Publication year of the book
 * @apiSuccess {String} books.original_title Original title of the book
 * @apiSuccess {String} books.title Title of the book
 * @apiSuccess {Object} books.ratings Ratings information of the book
 * @apiSuccess {Number} books.ratings.average Average rating of the book
 * @apiSuccess {Number} books.ratings.count Total number of ratings for the book
 * @apiSuccess {Number} books.ratings.rating_1_star Number of 1-star ratings
 * @apiSuccess {Number} books.ratings.rating_2_star Number of 2-star ratings
 * @apiSuccess {Number} books.ratings.rating_3_star Number of 3-star ratings
 * @apiSuccess {Number} books.ratings.rating_4_star Number of 4-star ratings
 * @apiSuccess {Number} books.ratings.rating_5_star Number of 5-star ratings
 * @apiSuccess {Object} books.icons Icon URLs of the book cover
 * @apiSuccess {String} books.icons.large URL of the large-sized cover image
 * @apiSuccess {String} books.icons.small URL of the small-sized cover image
 */
booksRouter.get('/all', async (req: Request, res: Response) => {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const offset: number = (page - 1) * limit;

    try {
        const query = `
            SELECT
                isbn13,
                authors,
                publication_year,
                original_title,
                title,
                rating_avg AS "ratings.average",
                rating_count AS "ratings.count",
                rating_1_star AS "ratings.rating_1",
                rating_2_star AS "ratings.rating_2",
                rating_3_star AS "ratings.rating_3",
                rating_4_star AS "ratings.rating_4",
                rating_5_star AS "ratings.rating_5",
                image_url AS "icons.large",
                image_small_url AS "icons.small"
            FROM
                books
            ORDER BY
                isbn13
            LIMIT
                $1
            OFFSET
                $2`;

        const { rows } = await pool.query(query, [limit, offset]);
        res.json({ books: rows });
    } catch (error) {
        console.error('DB Query error on GET all');
        console.error(error);
        res.status(500).json({ error: 'Server error - contact support' });
    }
});

// "return" the router
export { booksRouter };
