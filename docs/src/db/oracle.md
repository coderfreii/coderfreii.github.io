## 安装

申请账号下载 oracle 数据库

新版 oracle 数据库 分为 数据库分两种数据库 CDB(容器数据库)、PDB(可插拔数据库)

安装时

选择 PDB 数据库 可规避用户名明明问题

卸载时

停止服务

用 Oracle 自带工具库卸载

清理注册表

清理环境变量

并清理
32 位系统：删除 C:\Program Files(x86)\Oracle\Inventory\ContentsXML 目录下的 inventory.xml 文件
64 位系统：删除 C:\Program Files\Oracle\Inventory\ContentsXML 目录下的 inventory.xml 文件

删除所有文件 包括解压文件

重新解压安装即可



## 常用查询

### 业务

#### 分页查询

~~~sql
select rownum ,e.* from SENSOR_CONFIG e;
 
第一页	
select rownum r,e.* from SENSOR_CONFIG e where rownum <=5;
	
select * from (select rownum r,e.* from SENSOR_CONFIG e where rownum <=5) t where r>0;
		
第二页		
select rownum r,e.* from SENSOR_CONFIG e where rownum <=10;
		
select rownum,t.* from (select rownum r,e.* from SENSOR_CONFIG e where rownum <=10) t where r>5;
	
第三页		
select rownum r,e. * from SENSOR_CONFIG e where rownum<=15;
	
select * from (select rownum r,e. * from SENSOR_CONFIG e where rownum<=15) t where r>10;
		
		
n 查询页
m 分页条数
select * from (select rownum r,e. * from 要分页的表 e where rownum<=m*n) t where r>m*n-m ;




 select 
 * 
 from 
 
 (	
		select 
			rownum r,
			e. * 
		from 
			要分页的表 e
		where 
			rownum<=pageSize*page
	) 
 
 
 where r>pageSize*page-pageSize ;



 select 
 * 
 from 
 
 (	
		select 
			rownum r,
			e. * 
		from 
			要分页的表 e
		where 
			rownum < (start+offset)
	) 
 
 
 where r>(start-1) ;

~~~

#### 树查询

```sql
START WITH ID=#{deptId} CONNECT BY PRIOR ID=PARENT_ID



　　SELECT [LEVEL],*

　　FEOM table_name 

　　START WITH 条件1

　　CONNECT BY PRIOR 条件2

　　WHERE 条件3

　　ORDER　BY　排序字段

　　说明：LEVEL---伪列，用于表示树的层次

　　　　　条件1---根节点的限定条件，当然也可以放宽权限，以获得多个根节点，也就是获取多个树

　　　　　条件2---连接条件，目的就是给出父子之间的关系是什么，根据这个关系进行递归查询

　　　　　条件3---过滤条件，对所有返回的记录进行过滤。

　　　　　排序字段---对所有返回记录进行排序

　　对prior说明：要的时候有两种写法：connect by prior dept_id=par_dept_id 或 connect by dept_id=prior par_dept_id，前一种写法表示采用自上而下的搜索方式（先找父节点然后找子节点），后一种写法表示采用自下而上的搜索方式（先找叶子节点然后找父节点）。 
```



## 特性

### 连接

~~~sql
left join(左联接)     返回包括左表中的所有记录和右表中联结字段相等的记录 
right join(右联接)    返回包括右表中的所有记录和左表中联结字段相等的记录
inner join(等值连接)   只返回两个表中联结字段相等的行
~~~



### 索引

#### 查看

1、查看表中有哪些索引

select * from user_indexes where table_name = '表名'

select * from all_indexes where table_name = '表名'

select * from dba_indexes where table_name = 'TEMP_MONTH_REPORT_202006';

2、查看表中索引对应哪些列

select * from user_ind_columns where table_name='表名'

​		

```sql
select * from user_cons_columns cu, user_constraints au where cu.constraint_name=au.constraint_name and cu.table_name=''
```

##### 查看表索引

~~~sql
select t.*,i.index_type from user_ind_columns t,user_indexes i where t.index_name = i.index_name and
t.table_name='TEMP_MONTH_REPORT_202006'
~~~

#### 创建索引

~~~sql
 create index 索引名称 on table(column) 
~~~

#### 删除索引

~~~sql
drop index 索引名称
~~~





### 表结构

#### 查询

##### 查询ddl

~~~sql
SELECT DBMS_METADATA.GET_DDL('TABLE','SENSOR_DTL_370000') FROM DUAL;
~~~

##### 查询用户表字段

~~~sql
select *from user_tab_columns where table_name='SENSOR_DTL_370000';
~~~

##### 查看表的注释

```sql
select * from user_tab_comments where table_name = '表名';
```

##### 查看表中字段的注释

```sql
select * from user_col_comments where table_name = '表名';
```



#### 函数

##### COUTNT

+ 不能查询出 null 的个数

~~~sql
SELECT 
	COUNT(
		CASE 
			WHEN c.A IS null THEN
				2
			ELSE
				1
		END) ,
		
	COUNT(c.A)	

FROM ( 
 SELECT   null  as a FROM dual  
 UNION ALL
 SELECT   null  as a FROM dual   UNION ALL
 SELECT   1  as a FROM dual UNION ALL
 SELECT   1  as a FROM dual 
 
 ) c GROUP BY c.A
~~~

### 报错

#### ORA-29275部分多字节字符

~~~sql
 to_nchar(问题字节)
~~~

###### 恢复数据

~~~java
select * from xxxx as of TIMESTAMP to_timestamp('20211230 09:00:00','yyyymmdd hh24:mi:ss')
~~~

