'use strict'
class Point{
	x=0;y=0;z=0;
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
class Quartenion{
	x=0;y=0;z=0;w=0;
	constructor(x, y, z, w) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}
}
class Pose{
	position=new Point();
	orientation=new Quartenion();
	constructor(position, orientation) {
		this.position = position;
		this.orientation = orientation;
	}
}