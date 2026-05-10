/**
 * BaseService provides generic CRUD operations for Mongoose models.
 * Extend this class for domain-specific services to avoid boilerplate.
 *
 * Example:
 *   class UserService extends BaseService {
 *     constructor() { super(User); }
 *   }
 */
class BaseService {
  constructor(Model) {
    this.Model = Model;
  }

  async findAll(filter = {}, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt', select = '' } = options;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.Model.find(filter).sort(sort).skip(skip).limit(limit).select(select),
      this.Model.countDocuments(filter),
    ]);
    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id) {
    return this.Model.findById(id);
  }

  async findOne(filter) {
    return this.Model.findOne(filter);
  }

  async create(data) {
    return this.Model.create(data);
  }

  async updateById(id, data, options = { new: true, runValidators: true }) {
    return this.Model.findByIdAndUpdate(id, data, options);
  }

  async deleteById(id) {
    return this.Model.findByIdAndDelete(id);
  }

  async exists(filter) {
    return this.Model.exists(filter);
  }

  async count(filter = {}) {
    return this.Model.countDocuments(filter);
  }
}

module.exports = { BaseService };
