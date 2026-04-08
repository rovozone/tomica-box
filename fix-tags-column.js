/**
 * 检查并修复 cars 表的 tags 列
 * 运行方式: node fix-tags-column.js
 */

const { createClient } = require("@supabase/supabase-js");

// 从 .env.local 读取配置
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 找不到环境变量，请确保 .env.local 文件存在");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixTagsColumn() {
  console.log("🔍 检查 cars 表的 tags 列...\n");

  try {
    // 1. 尝试查询 cars 表结构
    const { data: columns, error: columnError } = await supabase
      .rpc("get_table_columns", { table_name: "cars" })
      .select("*");

    if (columnError) {
      console.log("⚠️  无法直接查询列信息，尝试其他方法...\n");

      // 2. 尝试插入一条测试数据来检查 tags 列是否存在
      const testData = {
        number: "__TEST__",
        name: "__测试数据__",
        tags: ["测试标签"],
      };

      const { error: insertError } = await supabase
        .from("cars")
        .insert(testData);

      if (insertError && insertError.message.includes("tags")) {
        console.log("❌ tags 列不存在！需要添加该列。\n");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("请在 Supabase 控制台执行以下 SQL：");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        console.log("ALTER TABLE cars ADD COLUMN IF NOT EXISTS tags text[] DEFAULT NULL;");
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        console.log("📋 操作步骤：");
        console.log("1. 打开: https://yhyifjwptzagwvftlqyw.supabase.co");
        console.log("2. 点击左侧菜单的 \"SQL Editor\"");
        console.log("3. 新建一个查询，粘贴上面的 SQL 语句");
        console.log("4. 点击 \"Run\" 执行");
        console.log("5. 执行成功后，重新运行此脚本验证\n");
        return;
      }

      // 清理测试数据
      if (!insertError) {
        await supabase.from("cars").delete().eq("number", "__TEST__");
      }
    }

    // 3. 验证 tags 列是否正常工作
    console.log("✅ tags 列已存在！\n");

    // 查询所有有标签的车
    const { data: carsWithTags, error: queryError } = await supabase
      .from("cars")
      .select("id, name, tags")
      .not("tags", "is", null);

    if (queryError) {
      console.log("❌ 查询 tags 列时出错:", queryError.message);
      return;
    }

    if (carsWithTags && carsWithTags.length > 0) {
      console.log(`📊 当前有 ${carsWithTags.length} 辆车带有标签：\n`);
      carsWithTags.forEach((car, i) => {
        console.log(`  ${i + 1}. ${car.name || "未命名"}: ${JSON.stringify(car.tags)}`);
      });
    } else {
      console.log("📊 当前还没有任何车带有标签\n");
    }

    console.log("\n✅ 数据库检查完成！现在可以正常保存标签了。");

  } catch (error) {
    console.error("❌ 检查过程中出错:", error.message);
  }
}

checkAndFixTagsColumn();
