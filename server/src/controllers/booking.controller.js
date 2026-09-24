/**
 * Booking Controller
 * Manages customer bookings, provider assignments, cancellations, and quote acceptances.
 */

const bookingService = require('../services/booking.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Customer accepts quote and confirms booking schedule
 */
const acceptQuoteAndBook = async (req, res, next) => {
  try {
    const requestId = req.params.requestId || req.params.id;
    const quoteId = req.params.quoteId;
    const result = await bookingService.createBookingFromQuote(
      req.user,
      requestId,
      quoteId,
      req.body
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quote accepted and booking confirmed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer lists their bookings
 */
const listCustomerBookings = async (req, res, next) => {
  try {
    const result = await bookingService.listCustomerBookings(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer bookings retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer retrieves single booking detail
 */
const getCustomerBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getCustomerBookingById(req.user._id, req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Booking details retrieved successfully',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer cancels their booking
 */
const cancelCustomerBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelCustomerBooking(
      req.user._id,
      req.params.id,
      req.body.reason
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Booking cancelled successfully',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider lists their assigned bookings
 */
const listProviderBookings = async (req, res, next) => {
  try {
    const result = await bookingService.listProviderBookings(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider bookings retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider retrieves single assigned booking detail
 */
const getProviderBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getProviderBookingById(req.user._id, req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider booking details retrieved successfully',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider cancels their assigned booking
 */
const cancelProviderBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelProviderBooking(
      req.user._id,
      req.params.id,
      req.body.reason
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Booking cancelled successfully by provider',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  acceptQuoteAndBook,
  listCustomerBookings,
  getCustomerBookingById,
  cancelCustomerBooking,
  listProviderBookings,
  getProviderBookingById,
  cancelProviderBooking,
};
