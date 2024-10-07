const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//major
exports.createMajor = async (req, res) => {
  try {
    const { major_code, majorNameTH, majorNameENG, majorYear, majorUnit, status } = req.body;

    // ตรวจสอบว่ามีข้อมูลทุกช่องที่จำเป็นหรือไม่
    if (!major_code || !majorNameTH || !majorNameENG || !majorYear || !majorUnit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ตรวจสอบว่า major_code มีอยู่แล้วหรือไม่
    const existingMajor = await prisma.major.findFirst({
      where: { major_code: major_code }
    });

    if (existingMajor) {
      return res.status(409).json({ error: 'Major code already exists' });
    }

    // สร้าง major ใหม่
    const newMajor = await prisma.major.create({
      data: {
        major_code,
        majorNameTH,
        majorNameENG,
        majorYear,
        majorUnit,
        status
      }
    });

    res.status(201).json(newMajor);
  } catch (error) {
    console.error('Error creating major:', error);

    // ตรวจสอบข้อผิดพลาดที่เกี่ยวข้องกับการละเมิดข้อจำกัด unique constraint
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Major code already exists' });
    }

    res.status(500).json({ error: 'An unexpected error occurred while creating the major' });
  }
};
exports.getAllMajors = async (req, res) => {
  try {
    const majors = await prisma.major.findMany();

    if (!majors || majors.length === 0) {
      return res.status(404).json({ error: 'No majors found' });
    }

    res.status(200).json(majors);
  } catch (error) {
    console.error('Error fetching all majors:', error);
    res.status(500).json({ error: 'An error occurred while fetching majors' });
  }
};
exports.getMajorByCode = async (req, res) => {
  try {
    const { major_code } = req.params;

    if (!major_code) {
      return res.status(400).json({ error: 'Missing major_code' });
    }

    const major = await prisma.major.findFirst({
      where: { major_code: major_code }
    });

    if (!major) {
      return res.status(404).json({ error: 'Major not found' });
    }

    res.status(200).json(major);
  } catch (error) {
    console.error('Error fetching major by code:', error);
    res.status(500).json({ error: 'An error occurred while fetching the major' });
  }
};
exports.getMajorById = async (req, res) => {
  try {
    const { id } = req.params;
    const majorId = parseInt(id, 10);

    if (isNaN(majorId)) {
      return res.status(400).json({ error: "Invalid major ID format" });
    }

    const major = await prisma.major.findUnique({
      where: { major_id: majorId },
    });

    if (!major) {
      return res.status(404).json({ error: "Major not found" });
    }

    res.status(200).json(major);
  } catch (error) {
    console.error("Error fetching major by ID:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the major" });
  }
};
exports.updateMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const { major_code, majorNameTH, majorNameENG, majorYear, majorUnit, status } = req.body;

    if (!id || isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'Invalid or missing major_id' });
    }

    const majorExists = await prisma.major.findUnique({
      where: { major_id: parseInt(id, 10) }
    });

    if (!majorExists) {
      return res.status(404).json({ error: 'Major not found' });
    }

    const updatedMajor = await prisma.major.update({
      where: { major_id: parseInt(id, 10) },
      data: {
        major_code,
        majorNameTH,
        majorNameENG,
        majorYear,
        majorUnit,
        status
      }
    });

    res.status(200).json(updatedMajor);
  } catch (error) {
    console.error('Error updating major:', error);

    // ตรวจสอบข้อผิดพลาดที่เกิดจากการละเมิด unique constraint
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Major code already exists' });
    }

    res.status(500).json({ error: 'An error occurred while updating the major' });
  }
};
exports.deleteMajor = async (req, res) => {
  const { major_id } = req.params;

  try {
    if (!major_id || isNaN(parseInt(major_id, 10))) {
      return res.status(400).json({ error: 'Invalid or missing major_id' });
    }

    // ตรวจสอบว่า Major มีอยู่จริงหรือไม่
    const major = await prisma.major.findUnique({
      where: { major_id: parseInt(major_id, 10) },
    });

    if (!major) {
      return res.status(404).json({ error: 'Major not found' });
    }

    // ลบข้อมูลที่เกี่ยวข้องใน group_major ก่อน
    const categories = await prisma.category.findMany({
      where: { major_id: parseInt(major_id, 10) },
      select: { category_id: true }
    });

    if (categories.length === 0) {
      return res.status(404).json({ error: 'No categories found related to this major' });
    }

    const categoryIds = categories.map(c => c.category_id);

    // ลบ course ที่เชื่อมต่อกับ category
    const courses = await prisma.course.findMany({
      where: { category_id: { in: categoryIds } },
      select: { course_id: true }
    });

    const courseIds = courses.map(c => c.course_id);

    // ลบข้อมูลจากตารางต่าง ๆ
    await prisma.course.deleteMany({
      where: { course_id: { in: courseIds } },
    });

    await prisma.group_major.deleteMany({
      where: { category_id: { in: categoryIds } },
    });

    await prisma.category.deleteMany({
      where: { major_id: parseInt(major_id, 10) },
    });

    // ลบ major
    await prisma.major.delete({
      where: { major_id: parseInt(major_id, 10) },
    });

    res.json({ message: 'Major and related courses successfully deleted' });
  } catch (error) {
    console.error('Error deleting Major:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Category
exports.createCategory = async (req, res) => {
  try {
    const { category_name, category_unit, major_id } = req.body;

    // ตรวจสอบว่ามีข้อมูลครบทุกช่องที่จำเป็นหรือไม่
    if (!category_name || !category_unit || !major_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ตรวจสอบว่า major_id มีอยู่หรือไม่
    const majorExists = await prisma.major.findUnique({
      where: { major_id: parseInt(major_id) },  // ตรวจสอบให้แน่ใจว่า major_id เป็น integer
    });

    if (!majorExists) {
      return res.status(400).json({ error: 'Invalid major_id: No matching major found' });
    }

    // สร้าง Category ใหม่
    const newCategory = await prisma.category.create({
      data: {
        category_name,
        category_unit,
        major_id: parseInt(major_id),
      },
    });

    res.status(201).json(newCategory);
  } catch (error) {
    if (error.code === 'P2002') {
      // ข้อผิดพลาดจาก Prisma เมื่อมี unique constraint ที่ซ้ำ
      res.status(400).json({ error: 'Category with this ID already exists' });
    } else {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'An error occurred while creating the category' });
    }
  }
};
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching all categories:', error);
    res.status(500).json({ error: 'An error occurred while fetching categories' });
  }
};
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    // ตรวจสอบว่า category_id มีการส่งมาและถูกต้องหรือไม่
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category_id format' });
    }

    const category = await prisma.category.findUnique({
      where: { category_id: categoryId },
    });

    if (category) {
      res.status(200).json(category);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    console.error('Error fetching category by ID:', error);
    res.status(500).json({ error: 'An error occurred while fetching the category' });
  }
};
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);
    const { category_name, category_unit, major_id } = req.body;

    // ตรวจสอบว่า category_id มีการส่งมาและถูกต้องหรือไม่
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category_id format' });
    }

    // ตรวจสอบว่ามีข้อมูลครบทุกช่องที่จำเป็นหรือไม่
    if (!category_name || !category_unit || !major_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updatedCategory = await prisma.category.update({
      where: { category_id: categoryId },
      data: {
        category_name,
        category_unit,
        major_id: parseInt(major_id),
      },
    });

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'An error occurred while updating the category' });
  }
};
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    // ตรวจสอบว่า category_id มีการส่งมาและถูกต้องหรือไม่
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category_id format' });
    }

    // ตรวจสอบว่า Category มีอยู่จริงหรือไม่
    const category = await prisma.category.findUnique({
      where: { category_id: categoryId }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // ลบ Course ที่เชื่อมต่อกับ GroupMajor ภายใน Category
    await prisma.course.deleteMany({
      where: {
        group_major: {
          category_id: categoryId
        }
      }
    });

    // ลบ GroupMajor ที่เชื่อมต่อกับ Category
    await prisma.group_major.deleteMany({
      where: { category_id: categoryId }
    });

    // ลบ Category
    await prisma.category.delete({
      where: { category_id: categoryId }
    });

    res.json({ message: 'Category successfully deleted' });
  } catch (error) {
    console.error('Error deleting Category:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Category' });
  }
};



// Group Major
exports.createGroupMajor = async (req, res) => {
  try {
    const { group_name, group_unit, category_id } = req.body;

    // ตรวจสอบว่าข้อมูลที่จำเป็นถูกส่งเข้ามาครบหรือไม่
    if (!group_name || !group_unit || !category_id) {
      return res.status(400).json({ error: 'Missing required fields: group_name, group_unit, or category_id' });
    }

    // ตรวจสอบว่า category_id มีอยู่จริงหรือไม่
    const categoryExists = await prisma.category.findUnique({
      where: { category_id },
    });
    
    if (!categoryExists) {
      return res.status(400).json({ error: 'Invalid category_id: No matching category found' });
    }

    // สร้าง Group Major ใหม่
    const newGroupMajor = await prisma.group_major.create({
      data: {
        group_name,
        group_unit,
        category_id,
      },
    });

    res.status(201).json(newGroupMajor);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Group Major with this ID already exists' });
    } else {
      console.error('Error creating group major:', error);
      res.status(500).json({ error: 'An error occurred while creating the group major' });
    }
  }
};
exports.getAllGroupMajors = async (req, res) => {
  try {
    const groupMajors = await prisma.group_major.findMany();

    if (!groupMajors.length) {
      return res.status(404).json({ error: 'No Group Majors found' });
    }

    res.status(200).json(groupMajors);
  } catch (error) {
    console.error('Error fetching all group majors:', error);
    res.status(500).json({ error: 'An error occurred while fetching group majors' });
  }
};
exports.getGroupMajorById = async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่า id ที่ส่งเข้ามาเป็นตัวเลขหรือไม่
    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const groupMajor = await prisma.group_major.findUnique({
      where: { group_id: groupId },
    });

    if (!groupMajor) {
      return res.status(404).json({ error: 'Group Major not found' });
    }

    res.status(200).json(groupMajor);
  } catch (error) {
    console.error('Error fetching group major by ID:', error);
    res.status(500).json({ error: 'An error occurred while fetching the group major' });
  }
};
exports.updateGroupMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const { group_name, group_unit, category_id } = req.body;

    // ตรวจสอบว่า id ที่ส่งเข้ามาเป็นตัวเลขหรือไม่
    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // ตรวจสอบว่าข้อมูลที่ส่งเข้ามาครบถ้วนหรือไม่
    if (!group_name || !group_unit || !category_id) {
      return res.status(400).json({ error: 'Missing required fields: group_name, group_unit, or category_id' });
    }

    // ตรวจสอบว่า category_id มีอยู่จริงหรือไม่
    const categoryExists = await prisma.category.findUnique({
      where: { category_id },
    });
    
    if (!categoryExists) {
      return res.status(400).json({ error: 'Invalid category_id: No matching category found' });
    }

    // อัปเดต Group Major
    const updatedGroupMajor = await prisma.group_major.update({
      where: { group_id: groupId },
      data: {
        group_name,
        group_unit,
        category_id,
      },
    });

    res.status(200).json(updatedGroupMajor);
  } catch (error) {
    console.error('Error updating group major:', error);
    res.status(500).json({ error: 'An error occurred while updating the group major' });
  }
};
exports.deleteGroupMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = parseInt(id);

    // ตรวจสอบว่า id ที่ส่งเข้ามาเป็นตัวเลขหรือไม่
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // ตรวจสอบว่า GroupMajor ที่ต้องการลบมีอยู่จริงหรือไม่
    const groupMajor = await prisma.group_major.findUnique({
      where: { group_id: groupId },
    });

    if (!groupMajor) {
      return res.status(404).json({ error: 'Group Major not found' });
    }

    // ลบข้อมูล Courses ที่เชื่อมโยงกับ GroupMajor นี้
    await prisma.course.deleteMany({
      where: { group_id: groupId },
    });

    // ลบ GroupMajor
    await prisma.group_major.delete({
      where: { group_id: groupId },
    });

    res.json({ message: 'Group Major successfully deleted' });
  } catch (error) {
    console.error('Error deleting Group Major:', error);
    res.status(500).json({ error: 'An error occurred while deleting the Group Major' });
  }
};



// Course
exports.createCourse = async (req, res) => {
  try {
    const { course_id, courseNameTH, courseNameENG, courseUnit, courseTheory, coursePractice, categoryResearch, category_id, group_id, freesubject } = req.body;

    // ตรวจสอบว่ามีข้อมูลทุกช่องที่จำเป็นหรือไม่
    if (!course_id || !courseNameTH || !courseNameENG || !courseUnit || !courseTheory || !coursePractice) {
      return res.status(400).json({ error: 'Missing required fields. Please provide course_id, courseNameTH, courseNameENG, courseUnit, courseTheory, and coursePractice.' });
    }

    // ตรวจสอบว่า course_id มีอยู่แล้วหรือไม่
    const existingCourse = await prisma.course.findFirst({
      where: { course_id: course_id }
    });

    if (existingCourse) {
      return res.status(409).json({ error: 'Course with this ID already exists' }); // แจ้งว่ารหัส course ซ้ำ
    }

    const newCourse = await prisma.course.create({
      data: {
        course_id,
        courseNameTH,
        courseNameENG,
        courseUnit,
        courseTheory,
        coursePractice,
        categoryResearch,
        category_id: category_id || null,
        group_id: group_id || null,
        freesubject: freesubject || false, // เพิ่ม freesubject และตั้งค่า default เป็น false ถ้าไม่มีข้อมูล
      },
    });

    res.status(201).json(newCourse);
  } catch (error) {
    // ตรวจสอบชนิดของ error
    if (error.code === 'P2002') {
      // P2002 คือ error ของ Prisma เมื่อมี unique constraint ที่ซ้ำ
      return res.status(409).json({ error: 'Course with this ID already exists' });
    }

    console.error('Error creating course:', error);
    res.status(500).json({ error: 'An unexpected error occurred while creating the course' });
  }
};
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany();
    if (courses.length === 0) {
      return res.status(404).json({ error: 'No courses found' });
    }
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching all courses:', error);
    res.status(500).json({ error: 'An error occurred while fetching courses' });
  }
};
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { course_id: id }, // เนื่องจาก course_id เป็น String, ไม่ต้อง parseInt
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error('Error fetching course by ID:', error);
    res.status(500).json({ error: 'An error occurred while fetching the course' });
  }
};
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseNameTH, courseNameENG, courseUnit, courseTheory, coursePractice, categoryResearch, category_id, group_id } = req.body;

    // ตรวจสอบว่ามีข้อมูลทุกช่องที่จำเป็นหรือไม่
    if (!courseNameTH || !courseNameENG || !courseUnit || !courseTheory || !coursePractice) {
      return res.status(400).json({ error: 'Missing required fields for update. Please provide courseNameTH, courseNameENG, courseUnit, courseTheory, and coursePractice.' });
    }

    const courseExists = await prisma.course.findUnique({
      where: { course_id: id },
    });

    if (!courseExists) {
      return res.status(404).json({ error: 'Course not found for update' });
    }

    const updatedCourse = await prisma.course.update({
      where: { course_id: id }, // เนื่องจาก course_id เป็น String, ไม่ต้อง parseInt
      data: {
        courseNameTH,
        courseNameENG,
        courseUnit,
        courseTheory,
        coursePractice,
        categoryResearch,
        category_id: category_id || null, // รับค่า null หรือ Int
        group_id: group_id || null, // รับค่า null หรือ Int
      },
    });

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'An error occurred while updating the course' });
  }
};
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { course_id: id },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found for deletion' });
    }

    await prisma.course.delete({
      where: { course_id: id }, // เนื่องจาก course_id เป็น String, ไม่ต้อง parseInt
    });

    res.json({ message: 'Course successfully deleted' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'An error occurred while deleting the course' });
  }
};


// Get courses by category_id
exports.getCoursesByCategoryId = async (req, res) => {
  try {
    const { category_id } = req.params;

    // ตรวจสอบว่ามี category_id หรือไม่
    if (!category_id) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    // ค้นหาคอร์สทั้งหมดที่ตรงกับ category_id
    const courses = await prisma.course.findMany({
      where: { category_id: parseInt(category_id) }
    });

    // ส่งข้อมูลคอร์สที่ค้นพบ
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses by category ID:', error);
    res.status(500).json({ error: 'An error occurred while fetching courses by category ID' });
  }
};
// Get categories by major_code
exports.getCategoriesByMajorCode = async (req, res) => {
  try {
    const { major_code } = req.params;

    // ตรวจสอบว่ามี major_code หรือไม่
    if (!major_code) {
      return res.status(400).json({ error: 'Major Code is required' });
    }

    // ค้นหา major โดยใช้ major_code
    const major = await prisma.major.findFirst({
      where: { major_code: major_code }
    });

    if (!major) {
      return res.status(404).json({ error: 'Major not found' });
    }

    // ค้นหาหมวดหมู่ทั้งหมดที่ตรงกับ major_id
    const categories = await prisma.category.findMany({
      where: { major_id: major.major_id }
    });

    // ส่งข้อมูลหมวดหมู่ที่ค้นพบ
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories by major code:', error);
    res.status(500).json({ error: 'An error occurred while fetching categories by major code' });
  }
};
// Get groups by category_id
exports.getGroupsByCategoryId = async (req, res) => {
  try {
    const { category_id } = req.params;

    // ตรวจสอบว่ามี category_id หรือไม่
    if (!category_id) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    // ค้นหากลุ่มหลักทั้งหมดที่ตรงกับ category_id
    const groups = await prisma.group_major.findMany({
      where: { category_id: parseInt(category_id) }
    });

    // ส่งข้อมูลกลุ่มหลักที่ค้นพบ
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error fetching groups by category ID:', error);
    res.status(500).json({ error: 'An error occurred while fetching groups by category ID' });
  }
};
// Get courses by group_id
exports.getCoursesByGroupId = async (req, res) => {
  try {
    const { group_id } = req.params;

    // ตรวจสอบว่ามี group_id หรือไม่
    if (!group_id) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    // ค้นหาคอร์สทั้งหมดที่ตรงกับ group_id
    const courses = await prisma.course.findMany({
      where: { group_id: parseInt(group_id) }
    });

    // ส่งข้อมูลคอร์สที่ค้นพบ
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses by group ID:', error);
    res.status(500).json({ error: 'An error occurred while fetching courses by group ID' });
  }
};
