-- 商家优惠活动：详情页宣传卡片，管理员和已认领商家可维护。
ALTER TABLE providers ADD COLUMN promotion TEXT DEFAULT '{}';
