const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { checkPermissions } = require('../middleware/permissions');

class BaseController {
  constructor(model) {
    this.model = model;
    this.modelName = model.modelName.toLowerCase();
  }

  /**
   * @desc    Get all documents
   * @route   GET /api/v1/:resource
   * @access  Private
   */
  getAll = asyncHandler(async (req, res, next) => {
    // Filter by tenant
    const filter = { tenantId: req.tenantId };
    
    // Advanced filtering
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    // Merge filters
    const queryFilter = { ...JSON.parse(queryStr), ...filter };
    
    // Execute query
    const query = this.model.find(queryFilter);
    
    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query.select(fields);
    }
    
    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query.sort(sortBy);
    } else {
      query.sort('-createdAt');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await this.model.countDocuments(queryFilter);
    
    query.skip(startIndex).limit(limit);
    
    // Populate
    if (req.query.populate) {
      const populateFields = req.query.populate.split(',').join(' ');
      query.populate(populateFields);
    }
    
    // Execute query
    const results = await query;
    
    // Pagination result
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results
    });
  });
  
  /**
   * @desc    Get single document
   * @route   GET /api/v1/:resource/:id
   * @access  Private
   */
  getOne = asyncHandler(async (req, res, next) => {
    let query = this.model.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });
    
    // Populate
    if (req.query.populate) {
      const populateFields = req.query.populate.split(',').join(' ');
      query = query.populate(populateFields);
    }
    
    const doc = await query;
    
    if (!doc) {
      return next(
        new ErrorResponse(
          `${this.modelName} not found with id of ${req.params.id}`,
          404
        )
      );
    }
    
    // Check permissions
    if (doc.user && doc.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this ${this.modelName}`,
          401
        )
      );
    }
    
    res.status(200).json({
      success: true,
      data: doc
    });
  });
  
  /**
   * @desc    Create document
   * @route   POST /api/v1/:resource
   * @access  Private
   */
  create = asyncHandler(async (req, res, next) => {
    // Add user and tenant to req.body
    req.body.user = req.user.id;
    req.body.tenantId = req.tenantId;
    
    const doc = await this.model.create(req.body);
    
    res.status(201).json({
      success: true,
      data: doc
    });
  });
  
  /**
   * @desc    Update document
   * @route   PUT /api/v1/:resource/:id
   * @access  Private
   */
  update = asyncHandler(async (req, res, next) => {
    let doc = await this.model.findById(req.params.id);
    
    if (!doc) {
      return next(
        new ErrorResponse(
          `${this.modelName} not found with id of ${req.params.id}`,
          404
        )
      );
    }
    
    // Check ownership and tenant
    if (doc.tenantId.toString() !== req.tenantId) {
      return next(
        new ErrorResponse(
          `Not authorized to update this ${this.modelName}`,
          401
        )
      );
    }
    
    // Check permissions
    if (doc.user && doc.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to update this ${this.modelName}`,
          401
        )
      );
    }
    
    // Update document
    doc = await this.model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: doc
    });
  });
  
  /**
   * @desc    Delete document
   * @route   DELETE /api/v1/:resource/:id
   * @access  Private
   */
  delete = asyncHandler(async (req, res, next) => {
    const doc = await this.model.findById(req.params.id);
    
    if (!doc) {
      return next(
        new ErrorResponse(
          `${this.modelName} not found with id of ${req.params.id}`,
          404
        )
      );
    }
    
    // Check tenant
    if (doc.tenantId.toString() !== req.tenantId) {
      return next(
        new ErrorResponse(
          `Not authorized to delete this ${this.modelName}`,
          401
        )
      );
    }
    
    // Check ownership
    if (doc.user && doc.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to delete this ${this.modelName}`,
          401
        )
      );
    }
    
    await doc.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  });
}

module.exports = BaseController;
